import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { KeyRound, Pencil, Plus, Shield, Trash2, UserPlus, Users as UsersIcon, X } from "lucide-react";
import { ErrorState, Header, LoadingState, Page, Panel } from "../components/States";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { userService } from "../services/api";

const emptyForm = { username: "", password: "", role: "viewer" };

export default function Users() {
  const { isAdmin, user: currentUser, updateCurrentSession } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [activeSection, setActiveSection] = useState("manage");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: "", password: "" });
  const [editBusy, setEditBusy] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await userService.list());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadUsers();
  }, [isAdmin, loadUsers]);

  if (!isAdmin) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await userService.create(form);
      setUsers((current) =>
        [...current, created].sort((left, right) =>
          left.username.localeCompare(right.username),
        ),
      );
      window.dispatchEvent(new Event("profiles-updated"));
      setForm(emptyForm);
      toast.success(`User "${created.username}" can now sign in.`);
      setActiveSection("manage");
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function startEditing(account) {
    setEditingUser(account);
    setEditForm({ username: account.username, password: "" });
  }

  async function saveUser(event) {
    event.preventDefault();
    setEditBusy(true);
    const changes = { username: editForm.username };
    if (editForm.password) changes.password = editForm.password;
    try {
      const updated = await userService.update(editingUser.username, changes);
      setUsers((current) =>
        current
          .map((account) =>
            account.username === editingUser.username
              ? { username: updated.username, role: updated.role }
              : account,
          )
          .sort((left, right) => left.username.localeCompare(right.username)),
      );
      window.dispatchEvent(new Event("profiles-updated"));
      if (editingUser.username === currentUser) {
        updateCurrentSession({
          ...updated,
          access_token: updated.access_token,
        });
      }
      setEditingUser(null);
      setEditForm({ username: "", password: "" });
      toast.success(`User "${updated.username}" updated.`);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deletingUser) return;
    setDeleteBusy(true);
    try {
      await userService.delete(deletingUser.username);
      setUsers((current) =>
        current.filter((account) => account.username !== deletingUser.username),
      );
      window.dispatchEvent(new Event("profiles-updated"));
      toast.success(`User "${deletingUser.username}" deleted.`);
      setDeletingUser(null);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  const adminCount = users.filter((account) => account.role === "admin").length;

  return (
    <Page>
      <Header
        eyebrow="ACCESS CONTROL"
        title="User management"
        text="Create accounts for people who need access to Customer Sphere."
      />

      <div className="tabs modelTabs userManagementTabs" role="tablist" aria-label="User management sections">
        <button
          id="users-manage-tab"
          type="button"
          role="tab"
          className={activeSection === "manage" ? "active" : ""}
          aria-selected={activeSection === "manage"}
          aria-controls="users-manage-panel"
          onClick={() => setActiveSection("manage")}
        >
          <UsersIcon size={15} />
          View &amp; edit users
        </button>
        <button
          id="users-create-tab"
          type="button"
          role="tab"
          className={activeSection === "create" ? "active" : ""}
          aria-selected={activeSection === "create"}
          aria-controls="users-create-panel"
          onClick={() => setActiveSection("create")}
        >
          <UserPlus size={15} />
          Create user
        </button>
      </div>

      {activeSection === "create" ? (
        <section
          id="users-create-panel"
          className="userManagementPanel"
          role="tabpanel"
          aria-labelledby="users-create-tab"
        >
          <Panel
            title="Create an account"
            sub="Set a username, temporary password, and access level for the new user."
          >
            <form className="userCreateForm" onSubmit={submit}>
              <label>
                Username
                <input
                  autoComplete="off"
                  minLength={3}
                  maxLength={80}
                  required
                  value={form.username}
                  onChange={(event) =>
                    setForm({ ...form, username: event.target.value })
                  }
                />
              </label>
              <label>
                Temporary password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
                <small>Use at least 8 characters.</small>
              </label>
              <label>
                Access role
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value })
                  }
                >
                  <option value="viewer">Viewer — read-only access</option>
                  <option value="admin">Administrator — full access</option>
                </select>
              </label>
              <button className="btn primary" type="submit" disabled={busy}>
                <Plus size={15} />
                {busy ? "Creating..." : "Create user"}
              </button>
            </form>
          </Panel>
        </section>
      ) : (
        <section
          id="users-manage-panel"
          className="userManagementPanel"
          role="tabpanel"
          aria-labelledby="users-manage-tab"
        >
          <Panel
            title="Application users"
            sub={`${users.length} account${users.length === 1 ? "" : "s"} can sign in. Edit account details or remove access here.`}
          >
            {loading ? (
              <LoadingState text="Loading users..." />
            ) : error ? (
              <ErrorState message={error} retry={loadUsers} />
            ) : (
              <div className="userTableWrap">
                <table className="userTable">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((account) => (
                      <tr key={account.username}>
                        <td>
                          <span className="userTableName">
                            <UsersIcon size={15} />
                            {account.username}
                          </span>
                        </td>
                        <td>
                          <span className={`userRoleBadge ${account.role}`}>
                            {account.role === "admin" ? (
                              <Shield size={13} />
                            ) : (
                              <KeyRound size={13} />
                            )}
                            {account.role === "admin" ? "Administrator" : "Viewer"}
                          </span>
                        </td>
                        <td>
                          <div className="userActions">
                            <button
                              className="btn ghost userEditButton"
                              type="button"
                              onClick={() => startEditing(account)}
                              aria-label={`Edit ${account.username}`}
                              title={`Edit ${account.username}`}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="btn danger userDeleteButton"
                              type="button"
                              onClick={() => setDeletingUser(account)}
                              aria-label={`Delete ${account.username}`}
                              title={
                                account.username === currentUser
                                  ? "You cannot delete your active account"
                                  : account.role === "admin" && adminCount <= 1
                                    ? "The last administrator cannot be deleted"
                                    : `Delete ${account.username}`
                              }
                              disabled={
                                account.username === currentUser ||
                                (account.role === "admin" && adminCount <= 1)
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </section>
      )}
      {editingUser && (
        <div className="modalBg">
          <form
            className="modal userEditModal"
            onSubmit={saveUser}
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${editingUser.username}`}
          >
            <button
              type="button"
              className="close"
              onClick={() => setEditingUser(null)}
              aria-label="Close edit user dialog"
              disabled={editBusy}
            >
              <X size={18} />
            </button>
            <p className="eyebrow">ACCOUNT SETTINGS</p>
            <h2>Edit user</h2>
            <label>
              Username
              <input
                autoComplete="off"
                minLength={3}
                maxLength={80}
                required
                value={editForm.username}
                onChange={(event) =>
                  setEditForm({ ...editForm, username: event.target.value })
                }
              />
            </label>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={editForm.password}
                onChange={(event) =>
                  setEditForm({ ...editForm, password: event.target.value })
                }
                placeholder="Leave blank to keep current password"
              />
              <small>Enter at least 8 characters to change the password.</small>
            </label>
            <p className="filterHint">
              Password changes do not terminate sessions that are already signed in.
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setEditingUser(null)}
                disabled={editBusy}
              >
                Cancel
              </button>
              <button className="btn primary" disabled={editBusy}>
                {editBusy ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deletingUser && (
        <ConfirmModal
          title="Delete user?"
          message={`Delete "${deletingUser.username}"? They will no longer be able to sign in, and their active sessions will be revoked. This action cannot be undone.`}
          confirmLabel="Delete user"
          loading={deleteBusy}
          onConfirm={confirmDeleteUser}
          onCancel={() => setDeletingUser(null)}
        />
      )}
    </Page>
  );
}
