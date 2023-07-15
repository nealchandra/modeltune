'use client';

import * as React from 'react';

import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import { Input } from '@app/components/ui/input';
import { Label } from '@app/components/ui/label';
import { UserSettings } from '@prisma/client';

export const SettingsCard: React.FC<{
  settings: UserSettings;
  updateUserSettings: (settings: UserSettings) => void;
}> = ({ settings, updateUserSettings }) => {
  const [userSettings, setUserSettings] =
    React.useState<UserSettings>(settings);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label>
          <Input
            placeholder="W&B Key"
            value={userSettings.wandbKey ?? ''}
            onChange={(e) =>
              setUserSettings({
                ...userSettings,
                wandbKey: e.target.value,
              })
            }
          />
        </Label>
        <Label>
          <Input
            placeholder="HF Access Token"
            value={userSettings.hfAccessToken ?? ''}
            onChange={(e) =>
              setUserSettings({
                ...userSettings,
                hfAccessToken: e.target.value,
              })
            }
          />
        </Label>
        <Button onClick={() => updateUserSettings({ userSettings })}>
          Update
        </Button>
      </CardContent>
    </Card>
  );
};
