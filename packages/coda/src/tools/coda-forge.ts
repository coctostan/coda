import { join, resolve } from 'node:path';
import { assembleScanContext, detectBackdrop, scaffoldCoda } from '../forge';
import type { ForgeInput, ForgeOutput } from './types';

export function codaForge(params: ForgeInput, defaultProjectRoot: string): ForgeOutput {
  const projectRoot = params.project_root ?? defaultProjectRoot;
  const backdrop = detectBackdrop(projectRoot);

  if (backdrop.type === 'existing') {
    return {
      status: 'already_initialized',
      backdrop: 'existing',
      coda_root: join(projectRoot, '.coda'),
      next_action: 'Use coda_status to see current state',
    };
  }

  const codaRoot = scaffoldCoda(projectRoot);

  if (backdrop.type === 'brownfield') {
    const promptsDir = resolve(__dirname, '..', '..', '..', '..', 'modules', 'prompts');
    return {
      status: 'scaffolded',
      backdrop: 'brownfield',
      coda_root: codaRoot,
      next_action: 'Review scan_context, then gather evidence',
      scan_context: assembleScanContext(projectRoot, promptsDir),
    };
  }

  return {
    status: 'scaffolded',
    backdrop: 'greenfield',
    coda_root: codaRoot,
    next_action: 'Use coda_create to create your first issue',
  };
}
