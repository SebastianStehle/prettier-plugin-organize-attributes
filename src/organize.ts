export const DEFAULT_GROUP = "$DEFAULT";

export type GroupQuery = string | RegExp;
export type GroupKey<TPresets extends Presets> =
  | keyof TPresets
  | string
  | typeof DEFAULT_GROUP;

export type Presets = Record<string, GroupQuery | GroupQuery[]>;

export type OrganizedGroup<TValue> = { values: TValue[]; query: GroupQuery };
export type OrganizedResult<TValue> = {
  groups: OrganizedGroup<TValue>[];
  flat: TValue[];
};

export interface BaseOrganizeOptions<TPresets extends Presets> {
  presets?: TPresets;
  groups: GroupKey<TPresets>[];
  sort?: OrganizeOptionsSort;
  ignoreCase?: boolean;
  ignoreChars?: string;
}

export type OrganizeOptionsSort = "ASC" | "DESC" | boolean;
export interface MapOrganizeOptions<TPresets extends Presets, TValue>
  extends BaseOrganizeOptions<TPresets> {
  map: (value: TValue) => string;
}

export type OrganizeOptions<TPresets extends Presets, TValue> =
  | BaseOrganizeOptions<TPresets>
  | MapOrganizeOptions<TPresets, TValue>;

export function miniorganize<TPresets extends Presets>(
  values: string[],
  options: BaseOrganizeOptions<TPresets>
): OrganizedResult<string>;
export function miniorganize<TPresets extends Presets, TValue>(
  values: TValue[],
  options: MapOrganizeOptions<TPresets, TValue>
): OrganizedResult<TValue>;
export function miniorganize<TValue>(
  values: TValue[],
  options: OrganizeOptions<Presets, TValue>
): OrganizedResult<TValue> {
  const getGroups = (
    query: GroupQuery
  ): {
    regexp?: RegExp;
    unknown: boolean;
    values: { sortKey: string; value: TValue }[];
    query: GroupQuery;
  }[] => {
    if (query === DEFAULT_GROUP) {
      return [getDefaultGroup()];
    }

    const preset = typeof query === "string" && options.presets?.[query];
    if (!preset) {
      return [
        {
          regexp: groupQueryToRegExp(query, !!options.ignoreCase),
          unknown: false,
          values: [],
          query,
        },
      ];
    }

    return Array.isArray(preset)
      ? preset.flatMap(getGroups)
      : getGroups(preset);
  };

  const groups = options.groups.flatMap(getGroups);

  let defaultGroup = groups.find((group) => group.unknown);
  if (!defaultGroup) {
    defaultGroup = getDefaultGroup();
    groups.push(defaultGroup);
  }

  let trimSet = 
    options.ignoreChars ?
    new Set(options.ignoreChars.split(''))
    : null

  const getString = (value: TValue): string => {
    let result: string;
    if ("map" in options) {
      result = options.map(value);
    } else if (typeof value === "string") {
      result = value;
    } else {
      throw Error("Neither a map function nor string values were passed!");
    }

    if (trimSet) {
      result = trim(result, trimSet);
    }

    return result;
  };

  values.forEach((value) => {
    const sortKey = getString(value);

    for (let group of groups) {
      if (group.regexp && sortKey.match(group.regexp)) {
        group.values.push({ value, sortKey });
        return;
      }
    }

    defaultGroup!.values.push({ value, sortKey });
  });

  console.log('SORT');

  if (options.sort) {
    groups.forEach((group) => {
      if (options.sort === "DESC") {
        group.values.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
      } else {
        group.values.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      }
    });
  }

  return {
    flat: groups.flatMap((group) => group.values.map(v => v.value)),
    groups: groups.map(({ query, values }) => ({ query, values: values.map(v => v.value) })),
  };
}

function groupQueryToRegExp(query: GroupQuery, ignoreCase: boolean): RegExp {
  let flags = "";

  if (ignoreCase) {
    flags += "i";
  }

  return new RegExp(query, flags);
}

function getDefaultGroup() {
  return {
    unknown: true,
    values: [],
    query: DEFAULT_GROUP,
  };
}

const trim = (str: string, chars: Set<string>) => {
  let start = 0,  end = str.length;

  while (start < end && chars.has(str[start])) {
    ++start;
  }

  while (end > start && chars.has(str[end - 1])) {
    --end;
  }

  return (start > 0 || end < str.length) 
  ? str.substring(start, end) 
  : str;
}
