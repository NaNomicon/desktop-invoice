import { useCallback, useState } from 'react';
import { execute, query } from '@/lib/db';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Save } from 'lucide-react';
import { toast } from 'sonner';

function ChangePasswordPage() {
  const currentUserId = useAuthStore((state) => state.user_id);
  const currentUserName = useAuthStore((state) => state.user_name);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!currentUserId || !currentUserName) {
      toast.error('No active user session found');
      return;
    }

    if (!currentPassword.trim()) {
      toast.error('Current password is required');
      return;
    }

    if (!newPassword.trim()) {
      toast.error('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setSaving(true);
    try {
      const rows = await query<User>(
        'SELECT id, password FROM tbl_user WHERE id = ? AND is_deleted = 0 LIMIT 1',
        [currentUserId],
      );
      const user = rows[0];

      if (!user) {
        toast.error('User account was not found');
        return;
      }

      if (user.password !== currentPassword) {
        toast.error('Current password is not valid');
        return;
      }

      await execute('UPDATE tbl_user SET password = ? WHERE id = ?', [
        newPassword,
        currentUserId,
      ]);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated');
    } catch (error) {
      toast.error(`Password update failed: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  }, [confirmPassword, currentPassword, currentUserId, currentUserName, newPassword]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="size-5" />
        <h1 className="text-2xl font-semibold">Change Password</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Update Login Password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{currentUserName}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleSave()} disabled={saving}>
              <Save className="size-4" />
              {saving ? 'Saving...' : 'Save Password'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChangePasswordPage;
