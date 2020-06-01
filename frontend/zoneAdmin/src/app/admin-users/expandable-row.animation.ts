import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

export const expandableRowAnimation = trigger('expandableRow', [
  state('collapsed, void', style({
    height: '0px',
    visibility: 'hidden'
  })),
  state('expanded', style({
    'min-height': '48px',
    height: '*',
    visibility: 'visible'
  })),
  transition(
    'expanded <=> collapsed, void <=> *',
    animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
  ),
]);
