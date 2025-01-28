import { chain, externalSchematic, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

export function ngAdd(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('Adding Environments...');

    // Read angular.json to determine the project name
    const workspaceConfig = tree.read('angular.json');
    if (!workspaceConfig) {
      throw new Error('Could not find angular.json');
    }

    const workspaceJson = JSON.parse(workspaceConfig.toString());
    const projectName = Object.keys(workspaceJson.projects)[0];
    if (!projectName) {
      throw new Error('No project name found in angular.json');
    }

    // Chain rules to generate environments
    return chain([
      generateEnvironments(projectName),
    ]);
  };
}

export function generateEnvironments(projectName: string): Rule {
  return externalSchematic('@schematics/angular', 'environments', {
    project: projectName,
  });
}
