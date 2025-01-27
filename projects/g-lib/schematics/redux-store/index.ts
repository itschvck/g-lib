import {
  apply,
  applyTemplates, chain,
  mergeWith, move,
  Rule,
  url
} from "@angular-devkit/schematics";
import { strings, normalize } from "@angular-devkit/core";
import { ReduxStoreSchema } from "./redux-store.interface";

export function reduxStore(options: ReduxStoreSchema): Rule {
  return () => {
    const templateSource = apply(
      url('./files'), [
        applyTemplates({
          classify: strings.classify,
          camelize: strings.camelize,
          dasherize: strings.dasherize,
          name: options.name
        }),
        move(normalize(`/${ options.path }/`))
      ]);
    return chain([
      mergeWith(templateSource)
    ]);
  }
}
