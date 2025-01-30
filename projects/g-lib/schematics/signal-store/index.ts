import {
  apply,
  applyTemplates, chain,
  mergeWith, move,
  Rule,
  url
} from "@angular-devkit/schematics";
import { strings, normalize } from "@angular-devkit/core";
import { SignalStoreSchema } from "./signal-store.interface";

export function signalStore(options: SignalStoreSchema): Rule {
  return () => {
    const templateSource = apply(
      url('./files'), [
        applyTemplates({
          classify: strings.classify,
          camelize: strings.camelize,
          dasherize: strings.dasherize,
          name: options.name,
          withCredentials: options.withCredentials
        }),
        move(normalize(`/${ options.path }/`))
      ]);
    return chain([
      mergeWith(templateSource)
    ]);
  }
}
