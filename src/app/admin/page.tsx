"use client";

import { useEffect, useState } from "react";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: "admin" | "member";
  created_at: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, role: "admin" | "member") => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm("Remove this user? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove user");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to remove user");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg("");
    setInviting(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send invite");
      }
      setInviteMsg(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (e: unknown) {
      setInviteMsg(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🦄</div>
          <h1 className="text-3xl font-bold text-purple-800">Admin Dashboard</h1>
          <p className="text-purple-600 text-sm mt-1">ATL Happy Hour</p>
        </div>

        {/* Invite Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-purple-800 mb-4">Invite Member</h2>
          <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="user@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="px-4 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {inviting ? "Sending…" : "Send Invite"}
            </button>
          </form>
          {inviteMsg && (
            <p
              className={`mt-3 text-sm ${
                inviteMsg.startsWith("Invite sent")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {inviteMsg}
            </p>
          )}
        </div>

        {/* Members List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-purple-800 mb-4">Members</h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-purple-700 border-b border-purple-100">
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4 hidden md:table-cell">Name</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4 hidden md:table-cell">Joined</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {users.map((user) => (
                    <tr key={user.id} className="py-2">
                      <td className="py-3 pr-4 text-gray-800">{user.email}</td>
                      <td className="py-3 pr-4 text-gray-600 hidden md:table-cell">
                        {user.display_name || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(
                              user.id,
                              e.target.value as "admin" | "member"
                            )
                          }
                          className="px-2 py-1 rounded-lg border border-purple-200 text-xs bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 hidden md:table-cell">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDeactivate(user.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center text-gray-500 py-8">No members yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
