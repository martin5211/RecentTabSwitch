import { SettingsStore } from '../shared/settings-store';
import { OptionsController } from './options-controller';

void new OptionsController(new SettingsStore(), document).start();
