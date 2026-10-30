"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, UserPlus, Check, Clock } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/types";

interface FriendRow {
  id: string;
  status: "pending" | "accepted";
  direction: "sent" | "received";
  profile: Profile;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const loadFriends = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("friendships")
      .select(`
        id, status, requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, username, full_name, avatar_url, created_at),
        addressee:profiles!friendships_addressee_id_fkey(id, username, full_name, avatar_url, created_at)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const rows: FriendRow[] = (data ?? []).map((f) => {
      const isSender = f.requester_id === user.id;
      return {
        id: f.id,
        status: f.status,
        direction: isSender ? "sent" : "received",
        profile: (isSender ? f.addressee : f.requester) as unknown as Profile,
      };
    });
    setFriends(rows);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  async function searchUsers(q: string) {
    setQuery(q);
    if (!q.trim() || !userId) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${q}%`)
      .neq("id", userId)
      .limit(5);
    setSearchResults((data as Profile[]) ?? []);
  }

  async function sendRequest(addresseeId: string) {
    if (!userId) return;
    await supabase.from("friendships").insert({ requester_id: userId, addressee_id: addresseeId });
    setSearchResults([]);
    setQuery("");
    await loadFriends();
  }

  async function acceptRequest(friendshipId: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    await loadFriends();
  }

  async function removeFriend(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
  }

  const existingIds = new Set(friends.map((f) => f.profile?.id));
  const accepted = friends.filter((f) => f.status === "accepted");
  const pending = friends.filter((f) => f.status === "pending");

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>;

  return (
    <div className="px-4 pt-8 pb-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Friends</h1>
        <p className="text-muted-foreground text-sm">{accepted.length} friends</p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => searchUsers(e.target.value)}
            placeholder="Find people by username…"
            className="w-full pl-9 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
            {searchResults.map((p) => {
              const isFriend = existingIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium">
                    {p.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">@{p.username}</p>
                    {p.full_name && <p className="text-xs text-muted-foreground">{p.full_name}</p>}
                  </div>
                  <button
                    onClick={() => !isFriend && sendRequest(p.id)}
                    disabled={isFriend}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full disabled:opacity-50 hover:bg-primary/20 transition-colors"
                  >
                    {isFriend ? <><Check size={12} /> Added</> : <><UserPlus size={12} /> Add</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending</h2>
          <div className="space-y-2">
            {pending.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-medium">
                  {f.profile?.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">@{f.profile?.username}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {f.direction === "sent" ? "Request sent" : "Wants to connect"}
                  </p>
                </div>
                {f.direction === "received" && (
                  <button
                    onClick={() => acceptRequest(f.id)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full"
                  >
                    Accept
                  </button>
                )}
                <button onClick={() => removeFriend(f.id)} className="text-xs text-muted-foreground hover:text-red-400">
                  {f.direction === "sent" ? "Cancel" : "Decline"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends list */}
      {accepted.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Friends</h2>
          <div className="space-y-2">
            {accepted.map((f) => (
              <Link
                key={f.id}
                href={`/friends/${f.profile?.id}`}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-medium">
                  {f.profile?.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">@{f.profile?.username}</p>
                  {f.profile?.full_name && <p className="text-xs text-muted-foreground">{f.profile.full_name}</p>}
                </div>
                <span className="text-muted-foreground text-xs">View list →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">👥</p>
          <p>Search for friends to see their movie rankings</p>
        </div>
      )}
    </div>
  );
}
