import {
  apply,
  applyTemplates,
  chain, externalSchematic,
  filter,
  MergeStrategy,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  Tree,
  url
} from '@angular-devkit/schematics';
import { normalize, strings } from '@angular-devkit/core';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { InitProjectSchema } from './init-project.interface';

export function initProject(options: InitProjectSchema): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    _context.logger.info('Starting schematic: initProject');

    // Step 1: Read angular.json and extract project info
    const workspaceConfig = _tree.read('angular.json');
    if (!workspaceConfig) {
      throw new Error('Could not find angular.json');
    }

    const workspaceJson = JSON.parse(workspaceConfig.toString());
    const projectName = Object.keys(workspaceJson.projects)[0];
    if (!projectName) {
      throw new Error('No project name found in angular.json');
    }

    const projectConfig = workspaceJson.projects[projectName];
    if (!projectConfig) {
      throw new Error(`Project "${ projectName }" not found in angular.json.`);
    }

    // Install npm packages separately with force flag

    let npmPackages = [
      { packageManager: 'npm', packageName: 'tailwindcss @tailwindcss/postcss postcss --force' },
      { packageManager: 'npm', packageName: 'moment --save' },
      { packageManager: 'npm', packageName: 'ng-inline-svg-2' },
    ];

    if (options.store === 'normal') {
      npmPackages.push(
        { packageManager: 'npm', packageName: '@ngrx/store @ngrx/entity @ngrx/effects @ngrx/operators @ngrx/store-devtools' }
      );
    }

    if (options.store === 'signal') {
      npmPackages.push(
        { packageManager: 'npm', packageName: '@ngrx/operators @ngrx/signals' }
      );
    }

    npmPackages.forEach((npmPkg) => {
      _context.addTask(new NodePackageInstallTask(npmPkg));
    });

    _context.logger.info('Adding Environments...');

    // Apply templates directly
    return applyTemplatesFn(options, projectName, projectConfig.prefix)(_tree, _context);
  };
}


export function applyTemplatesFn(options: InitProjectSchema, projectName: string, prefix: string): Rule {
  return () => {
    // Define the source for your templates
    const templateSource = apply(url('./files'), [
      filter((path) => {
        if (path.includes('src/app/core/app') && options.store !== 'normal') {
          return false;
        }
        // Exclude "src/app/domain/auth/redux" and everything inside it if store is not "normal"
        if (path.includes('src/app/core/domain/auth/redux') && options.store !== 'normal') {
          return false;
        }
        // Exclude "auth.store.ts.template" if store is not "signal"
        if (path.includes('src/app/core/domain/auth/auth.store.ts.template') && options.store !== 'signal') {
          return false;
        }
        // Ensure ".postcssrc.json.template" is always included
        if (path.includes('.postcssrc.json.template')) {
          return true; // Always include this file
        }
        return true;
      }),
      applyTemplates({
        classify: strings.classify,
        camelize: strings.camelize,
        dasherize: strings.dasherize,
        projectName: projectName,
        prefix: prefix,
        store: options.store.toString(),
      }),
      move(normalize(`./`)),
    ]);
    return chain([generateEnvironments(projectName), mergeWith(templateSource, MergeStrategy.Overwrite)]);
  };
}

export function generateEnvironments(projectName: string): Rule {
  return externalSchematic('@schematics/angular', 'environments', {
    project: projectName,
  });
}
