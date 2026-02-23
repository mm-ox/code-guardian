import { SetMetadata } from '@nestjs/common';

export const TASK_METADATA_KEY = 'TASK_METADATA';

export function Task(): ClassDecorator {
  return (target) => {
    SetMetadata(TASK_METADATA_KEY, true)(target);
  };
}
