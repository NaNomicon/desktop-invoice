import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { query } from '@/lib/db';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    query<User>('SELECT user_id, des FROM tbl_user WHERE is_deleted = 0 ORDER BY user_id').then(
      (rows) => {
        const opts: UserOption[] = rows.map((r) => ({
          user_id: r.user_id,
          des: r.des,
        }));
        setUsers(opts);
        if (opts.length > 0) setSelectedUser(opts[0]!.user_id);
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
        setPassword('');
        setError('Password Is Not Valid');
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
            <Label>User</Label>
            <Popover open={userOpen} onOpenChange={setUserOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedUser
                    ? users.find((u) => u.user_id === selectedUser)?.des ?? selectedUser
                    : 'Select user...'}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      {userOpen && users.slice(0, 50).map((u) => (
                        <CommandItem
                          key={u.user_id}
                          value={u.user_id}
                          onSelect={(currentValue) => {
                            setSelectedUser(currentValue);
                            setUserOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              selectedUser === u.user_id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {u.des ?? u.user_id}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
