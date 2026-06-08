type WebLocalDatabase = {
  execAsync: (source: string) => Promise<void>;
  getAllAsync: <T>(source: string, ...params: unknown[]) => Promise<T[]>;
  getFirstAsync: <T>(source: string, ...params: unknown[]) => Promise<T | null>;
  runAsync: (source: string, ...params: unknown[]) => Promise<void>;
  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;
};

const webDatabase: WebLocalDatabase = {
  execAsync: async () => {},
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
  runAsync: async () => {},
  withTransactionAsync: async (task) => {
    await task();
  }
};

export async function getLocalDatabase(): Promise<WebLocalDatabase> {
  return webDatabase;
}

export async function runLocalDatabaseMigrations(): Promise<void> {}
