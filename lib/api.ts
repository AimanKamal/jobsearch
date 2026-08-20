export interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}