type AdminUserContext = {
  id: string;
  email?: string;
};

declare module "h3" {
  interface H3EventContext {
    adminUser?: AdminUserContext;
  }
}

export {};
