import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

export function ngAdd(): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    _context.logger.info('## COLORO CHE USANO QUESTA LIBRERIA, DOVETE DARE A DJ ALMENO 100 EURO AD INSTALLAZIONE!!!!  ##');
  };
}
