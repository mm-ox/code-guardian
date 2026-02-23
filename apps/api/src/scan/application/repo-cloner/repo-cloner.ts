export abstract class RepoCloner {
  abstract clone(repositoryUrl: string, destinationPath: string): Promise<void>;
  abstract remove(repositoryPath: string): Promise<void>;
}
