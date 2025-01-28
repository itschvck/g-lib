import { Rule, SchematicContext, Tree, SchematicsException } from '@angular-devkit/schematics';
import { NodePackageInstallTask, RunSchematicTask } from '@angular-devkit/schematics/tasks';
import { addPackageJsonDependency, NodeDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';
import ts from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";

export function ngAdd(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('Adding NgRx dependencies to package.json...');
    const dependencies: NodeDependency[] = [
      { type: NodeDependencyType.Default, name: '@ngrx/store', version: '^19.0.0' },
      { type: NodeDependencyType.Default, name: '@ngrx/effects', version: '^19.0.0' },
      { type: NodeDependencyType.Default, name: '@ngrx/router-store', version: '^19.0.0' },
      { type: NodeDependencyType.Default, name: '@ngrx/entity', version: '^19.0.0' },
      { type: NodeDependencyType.Default, name: '@ngrx/operators', version: '^19.0.0' },
      { type: NodeDependencyType.Default, name: '@ngrx/store-devtools', version: '^19.0.0' },
    ];
    dependencies.forEach((dep) => {
      addPackageJsonDependency(tree, dep);
      context.logger.info(
        `Added "${dep.name}" to ${
          dep.type === NodeDependencyType.Dev ? 'devDependencies' : 'dependencies'
        }`
      );
    });

    const installTaskId = context.addTask(new NodePackageInstallTask());

    context.addTask(
      new RunSchematicTask('update-app-config', {}),
      [installTaskId]
    );

    return tree;
  };
}

export function updateAppConfig(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('Updating app.config.ts...');

    const configPath = '/src/app/app.config.ts';
    const configBuffer = tree.read(configPath);
    if (!configBuffer) {
      throw new SchematicsException(`The file ${configPath} doesn't exist.`);
    }
    const configContent = configBuffer.toString('utf-8');
    const sourceFile = ts.createSourceFile(
      configPath,
      configContent,
      ts.ScriptTarget.Latest,
      true
    );
    const recorder = tree.beginUpdate(configPath);

    const importsToAdd = [
      { symbolName: 'provideStore', modulePath: '@ngrx/store' },
      { symbolName: 'provideEffects', modulePath: '@ngrx/effects' },
      { symbolName: 'provideRouterStore', modulePath: '@ngrx/router-store' },
      { symbolName: 'provideStoreDevtools', modulePath: '@ngrx/store-devtools' },
    ];

    const importExists = (symbolName: string, modulePath: string): boolean => {
      return sourceFile.statements.some((node) => {
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
          if (moduleSpecifier === modulePath) {
            const namedBindings = node.importClause?.namedBindings;
            if (namedBindings && ts.isNamedImports(namedBindings)) {
              return namedBindings.elements.some(
                (element) => element.name.getText() === symbolName
              );
            }
          }
        }
        return false;
      });
    };

    importsToAdd.forEach(({ symbolName, modulePath }) => {
      if (!importExists(symbolName, modulePath)) {
        const importStatement = `import { ${symbolName} } from '${modulePath}';\n`;
        recorder.insertLeft(0, importStatement);
        context.logger.info(
          `Inserted import statement for ${symbolName} from ${modulePath}.`
        );
      } else {
        context.logger.info(
          `Import statement for ${symbolName} from ${modulePath} already exists.`
        );
      }
    });

    const providersArrayMatch = configContent.match(/providers:\s*\[([^\]]*)\]/);
    if (!providersArrayMatch) {
      throw new SchematicsException(`No 'providers' array found in ${configPath}`);
    }

    const providersArrayContent = providersArrayMatch[1];

    const providerExists = (provider: string): boolean => {
      const regex = new RegExp(`\\b${provider}\\b`);
      return regex.test(providersArrayContent);
    };

    const newProviders = [
      'provideStore()',
      'provideEffects()',
      'provideRouterStore()',
      'provideStoreDevtools({ maxAge: 25, logOnly: true, autoPause: true, trace: true, traceLimit: 75 })',
    ];

    const providersToAdd = newProviders.filter(
      (provider) => !providerExists(provider.split('(')[0])
    );

    const updatedProvidersArray = providersArrayContent
      ? `${providersArrayContent.trim()}, ${providersToAdd.join(', ')}`
      : providersToAdd.join(', ');

    const updatedConfigContent = configContent.replace(
      providersArrayMatch[0],
      `providers: [${updatedProvidersArray}]`
    );

    recorder.remove(0, configContent.length);
    recorder.insertLeft(0, updatedConfigContent);

    tree.commitUpdate(recorder);

    context.logger.info('app.config.ts has been updated.');

    return tree;
  };
}
