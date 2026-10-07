import { PropertyEntity } from '../../../src/modules/properties/property.entity';
import { PropertyConfigEntity } from '../../../src/modules/properties/property-config.entity';
import { configuration } from '../../../src/modules/properties/property-schema';
import { PROPERTY_STATUS } from '../../../src/shared/property.constants';
import { PROPERTIES } from './catalog';
import { ensure, type DemoContext } from './context';
export async function seedProperties(context: DemoContext): Promise<void> {
  for (const item of PROPERTIES) {
    const property = await ensure(context, PropertyEntity, 'property:' + item.key, {
      organizationId: context.orgId,
      name: item.name,
      type: item.type,
      status: PROPERTY_STATUS.ACTIVE,
      addressLine1: item.address,
      addressLine2: 'Fictional demonstration address',
      city: item.city,
      state: item.state,
      postalCode: item.postalCode,
      country: 'IN',
      timezone: 'Asia/Kolkata',
    });
    await ensure(context, PropertyConfigEntity, 'property-config:' + item.key, {
      organizationId: context.orgId,
      propertyId: property.id,
      configuration: configuration(item.type, {}),
    });
    context.properties.set(item.key, property);
  }
}
