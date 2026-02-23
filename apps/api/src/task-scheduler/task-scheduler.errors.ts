export class HandlerNotFoundError extends Error {
  constructor(taskClassName: string) {
    super(
      `No @TaskHandler found for task "${taskClassName}". ` +
        `Ensure a handler decorated with @TaskHandler(${taskClassName}) exists and is registered as a provider.`
    );
    this.name = 'HandlerNotFoundError';
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskClassName: string) {
    super(
      `@TaskHandler references "${taskClassName}", but it is not decorated with @Task(). ` +
        `Ensure the class is decorated with @Task().`
    );
    this.name = 'TaskNotFoundError';
  }
}
