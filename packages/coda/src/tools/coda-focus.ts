import { focusIssue } from '../workflow';
import type { FocusInput, FocusOutput } from './types';

export function codaFocus(params: FocusInput, codaRoot: string, projectRoot: string): FocusOutput {
  return focusIssue(codaRoot, projectRoot, params.slug, {
    createBranch: params.create_branch,
  });
}
