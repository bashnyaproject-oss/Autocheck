import { NativeTabs } from 'expo-router/native-tabs';

import { C } from '@/constants/theme';
import { useApp } from '@/state/app-state';

export default function AppTabs() {
  const { liked } = useApp();
  return (
    <NativeTabs backgroundColor={C.bg} labelStyle={{ selected: { color: C.ink } }} tintColor={C.ink}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Подбор</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'car', selected: 'car.fill' }} md="directions_car" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites">
        <NativeTabs.Trigger.Label>Избранное</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
        {liked.length ? <NativeTabs.Trigger.Badge>{String(liked.length)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sell">
        <NativeTabs.Trigger.Label>Продать</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="plus.circle" md="add_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Профиль</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
