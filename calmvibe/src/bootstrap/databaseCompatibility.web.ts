export const dbSchemaVersion = 1;

let checked = false;

export const resetDatabaseCompatibilityCache = () => {
  checked = false;
};

/**
 * WebではSQLite互換性チェックを行わない。
 */
export const ensureDatabaseCompatibility = async (): Promise<void> => {
  if (checked) return;
  checked = true;
};
