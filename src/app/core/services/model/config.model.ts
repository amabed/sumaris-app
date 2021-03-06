import {Moment} from "moment/moment";
import {fromDateISOString, isNotNil, toDateISOString} from "../../../shared/functions";
import {FormFieldDefinition} from "../../../shared/form/field.model";
import {Entity, EntityAsObjectOptions, EntityUtils, IEntity} from "./entity.model";
import {Department} from "./department.model";


export class Software<T extends Software<any> = Software<any>> extends Entity<T, EntityAsObjectOptions>
  implements IEntity<T, EntityAsObjectOptions> {

 static fromObject(source: any): Software {
    if (!source || source instanceof Software) return source;
    const res = new Software();
    res.fromObject(source);
    return res;
  }

  label: string;
  name: string;
  creationDate: Date | Moment;
  statusId: number;
  properties: { [key: string]: string };

  constructor() {
    super();
  }

  clone(): T {
    const target = new Software() as T;
    target.fromObject(this);
    return target;
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject(options);
    target.creationDate = toDateISOString(this.creationDate);
    target.properties = this.properties;
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.label = source.label;
    this.name = source.name;
    this.creationDate = fromDateISOString(source.creationDate);
    this.statusId = source.statusId;

    if (source.properties && source.properties instanceof Array) {
      this.properties = EntityUtils.getPropertyArrayAsObject(source.properties);
    } else {
      this.properties = source.properties;
    }
  }
}

export class Configuration extends Software<Configuration> {

  static fromObject(source: Configuration): Configuration {
    if (!source || source instanceof Configuration) return source;
    const res = new Configuration();
    res.fromObject(source);
    return res;
  }

  smallLogo: string;
  largeLogo: string;
  backgroundImages: string[];
  partners: Department[];

  constructor() {
    super();
  }

  clone(): Configuration {
    return this.copy(new Configuration());
  }

  copy(target: Configuration): Configuration {
    target.fromObject(this);
    return target;
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject(options);
    if (this.partners)
      target.partners = (this.partners || []).map(p => p.asObject(options));
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.smallLogo = source.smallLogo;
    this.largeLogo = source.largeLogo;
    this.backgroundImages = source.backgroundImages;
    if (source.partners)
      this.partners = (source.partners || []).map(Department.fromObject);
  }

  getPropertyAsBoolean(definition: FormFieldDefinition): boolean {
    const value = this.getProperty(definition);
    return isNotNil(value) ? (value && value !== "false") : undefined;
  }

  getPropertyAsNumbers(definition: FormFieldDefinition): number[] {
    const value = this.getProperty(definition);
    return value && value.split(',').map(parseInt) || undefined;
  }

  getPropertyAsStrings(definition: FormFieldDefinition): string[] {
    const value = this.getProperty(definition);
    return value && value.split(',') || undefined;
  }

  getProperty<T = string>(definition: FormFieldDefinition): T {
    return isNotNil(this.properties[definition.key]) ? this.properties[definition.key] : (definition.defaultValue || undefined);
  }
}
