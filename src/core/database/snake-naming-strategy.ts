import { DefaultNamingStrategy } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';
export class SnakeNamingStrategy extends DefaultNamingStrategy {
  public override tableName(className: string, customName: string): string {
    return customName || snakeCase(className);
  }
  public override columnName(propertyName: string, customName: string, prefixes: string[]): string {
    return snakeCase([...prefixes, customName || propertyName].join('_'));
  }
  public override relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }
  public override joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(relationName + '_' + referencedColumnName);
  }
}
