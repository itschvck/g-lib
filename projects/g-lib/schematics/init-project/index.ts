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

    // Step 2: Update the assets array in both build and test configurations
    ['build', 'test'].forEach((target) => {
      const targetConfig = projectConfig.architect[target];
      if (targetConfig?.options?.assets) {
        const assets = targetConfig.options.assets;

        if (!Array.isArray(assets)) {
          throw new Error(`Invalid assets format in "${target}" target.`);
        }

        const newAssets = ['src/favicon.ico', 'src/assets'];
        newAssets.forEach((newAsset) => {
          if (!assets.some((existingAsset) => {
            if (typeof existingAsset === 'string') {
              return existingAsset === newAsset;
            }
            if (typeof existingAsset === 'object' && existingAsset.input) {
              return existingAsset.input === newAsset;
            }
            return false;
          })) {
            assets.push(newAsset);
          }
        });
        _context.logger.info(`Updated assets array for "${target}" target.`);
      } else {
        _context.logger.warn(`No assets configuration found for "${target}" target.`);
      }
    });

    // Step 3: Write the updated angular.json file
    _tree.overwrite('angular.json', JSON.stringify(workspaceJson, null, 2));
    _context.logger.info('angular.json has been updated successfully.');

    // Step4: Install npm packages separately with force flag
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

    // Step 5: Apply templates directly
    return applyTemplatesFn(options, projectName, projectConfig.prefix)(_tree, _context);
  };
}


export function applyTemplatesFn(options: InitProjectSchema, projectName: string, prefix: string): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    // Detect the style format
    const style = getStyleFormat(_tree);
    _context.logger.info(`Detected style format: ${ style }`);

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
        // Ensure ".postcssrc.json" is always included
        if (path.includes('.postcssrc.json')) {
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
        style: style
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

function getStyleFormat(_tree: Tree): string {
  const workspaceConfigBuffer = _tree.read('angular.json');
  if (!workspaceConfigBuffer) {
    throw new Error('Could not find angular.json');
  }

  const workspaceJson = JSON.parse(workspaceConfigBuffer.toString());
  const projectName = Object.keys(workspaceJson.projects)[0];
  const projectConfig = workspaceJson.projects[projectName];

  // Check the schematics configuration for default style
  const defaultStyle = projectConfig.schematics?.['@schematics/angular:component']?.style;

  // Return the detected style or default to 'css'
  return defaultStyle || 'css';
}
