import {
  apply,
  applyTemplates,
  chain,
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
import { addPackageJsonDependency, NodeDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { InitProjectSchema } from './init-project.schema';

export function initProject(options: InitProjectSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('Starting schematic: initProject');

    // Step 1: Read angular.json and extract project info
    const workspaceConfig = tree.read('angular.json');
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
      throw new Error(`Project "${projectName}" not found in angular.json.`);
    }

    // Add dependencies to package.json
    const dependencies: NodeDependency[] = [
      { type: NodeDependencyType.Dev, name: 'tailwindcss', version: '^3.4.17' },
      { type: NodeDependencyType.Default, name: 'moment', version: '^2.30.1' },
      { type: NodeDependencyType.Default, name: 'ng-inline-svg-2', version: '^15.0.1' },
    ];

    if (options.store === 'normal') {
      dependencies.push(
        { type: NodeDependencyType.Default, name: '@ngrx/store', version: '^19.0.0' },
        { type: NodeDependencyType.Default, name: '@ngrx/entity', version: '^19.0.0' },
        { type: NodeDependencyType.Default, name: '@ngrx/effects', version: '^19.0.0' },
        { type: NodeDependencyType.Default, name: '@ngrx/operators', version: '^19.0.0' },
        { type: NodeDependencyType.Default, name: '@ngrx/store-devtools', version: '^19.0.0' }
      );
    } else if (options.store === 'signal') {
      dependencies.push(
        { type: NodeDependencyType.Default, name: '@ngrx/operators', version: '^19.0.0' },
        { type: NodeDependencyType.Default, name: '@ngrx/signals', version: '^19.0.0' }
      );
    }

    dependencies.forEach((dep) => {
      addPackageJsonDependency(tree, dep);
      context.logger.info(`Added dependency: ${dep.name}`);
    });

    // Schedule the NodePackageInstallTask
    context.addTask(new NodePackageInstallTask());

    // Apply templates directly
    return applyTemplatesFn(options, projectName, projectConfig.prefix)(tree, context);
  };
}


export function applyTemplatesFn(options: InitProjectSchema, projectName: string, prefix: string): Rule {
  return () => {
    // Define the source for your templates
    const templateSource = apply(url('./files'), [
      filter((path) => {
        return !(path.includes('app-store') && options.store !== 'normal');
      }),
      applyTemplates({
        classify: strings.classify,
        camelize: strings.camelize,
        dasherize: strings.dasherize,
        projectName: projectName,
        prefix: prefix,
        store: options.store.toString(),
      }),
      move(normalize(`.`)),
    ]);
    return chain([mergeWith(templateSource, MergeStrategy.Overwrite)]);
  };
}
