import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { query } from '@/lib/db';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserOption {
  user_id: string;
  des: string | null;
}

function Login() {
  const login = useAuthStore((s) => s.login);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    query<User>('SELECT user_id, des FROM tbl_user WHERE is_deleted = 0 ORDER BY user_id').then(
      (rows) => {
        const opts: UserOption[] = rows.map((r) => ({
          user_id: r.user_id,
          des: r.des,
        }));
        setUsers(opts);
      },
    );
  }, []);

  const handleLogin = useCallback(async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const ok = await login(selectedUser, password);
      if (!ok) {
        setError('Invalid password or user ID');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedUser, password, login]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleLogin();
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl">XPress Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="user-select">User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.des ?? u.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="password-input">Password</Label>
            <Input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" onClick={() => void handleLogin()} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
