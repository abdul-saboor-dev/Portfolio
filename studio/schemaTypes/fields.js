import { defineField } from 'sanity';

export const orderField = defineField({
  name: 'order',
  title: 'Display order',
  type: 'number',
  description: 'Lower numbers appear first.',
  initialValue: 0,
  validation: (rule) => rule.required().integer().min(0),
});

export function requiredUrlField({ name, title, description }) {
  return defineField({
    name,
    title,
    type: 'url',
    description,
    validation: (rule) => rule.required().uri({ scheme: ['http', 'https'] }),
  });
}
