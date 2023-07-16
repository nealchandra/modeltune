'use client';

import * as React from 'react';

import { Icons } from '@app/components/icons';
import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import { Input } from '@app/components/ui/input';
import { Label } from '@app/components/ui/label';
import { useToast } from '@app/components/ui/use-toast';
import { UserSettings } from '@prisma/client';

export const SettingsCard: React.FC<{
  settings: UserSettings;
  updateUserSettings: (settings: UserSettings) => void;
}> = ({ settings, updateUserSettings }) => {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [showPwd, setShowPwd] = React.useState<string | null>(null);

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
            onFocus={() => setShowPwd('wandbKey')}
            onBlur={() => setShowPwd(null)}
            type={showPwd === 'wandbKey' ? 'text' : 'password'}
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
            onFocus={() => setShowPwd('hfAccessToken')}
            onBlur={() => setShowPwd(null)}
            type={showPwd === 'hfAccessToken' ? 'text' : 'password'}
            value={userSettings.hfAccessToken ?? ''}
            onChange={(e) =>
              setUserSettings({
                ...userSettings,
                hfAccessToken: e.target.value,
              })
            }
          />
        </Label>
        <Button
          onClick={async () => {
            startTransition(async () => {
              setLoading(true);
              await updateUserSettings(userSettings);
              setLoading(false);
              toast({
                description: 'Your settings were updated.',
              });
            });
          }}
        >
          {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Update
        </Button>
      </CardContent>
    </Card>
  );
};
