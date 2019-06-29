import { FieldElement } from '@/components/FieldElement';
import { BooleanComponent, InputEvent } from '@/types';

export const BooleanElement: BooleanComponent = {
  name: 'BooleanElement',
  functional: true,
  render(h, { data, props }) {
    const on = {
      change({ target }: InputEvent) {
        props.field.setModel(target.checked);
      }
    };

    return h(FieldElement, data, [
      h('input', { ...data, on })
    ]);
  }
};
