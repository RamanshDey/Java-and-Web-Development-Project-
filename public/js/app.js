const state = {
  authMode: 'login',
  token: localStorage.getItem('smartTaskToken'),
  user: null,
  tasks: [],
  filters: {
    search: '',
    status: '',
    priority: ''
  },
  debounceTimer: null
};

const elements = {
  authView: document.querySelector('#authView'),
  dashboardView: document.querySelector('#dashboardView'),
  sessionPanel: document.querySelector('#sessionPanel'),
  currentUser: document.querySelector('#currentUser'),
  logoutButton: document.querySelector('#logoutButton'),
  authForm: document.querySelector('#authForm'),
  authSubmitButton: document.querySelector('#authSubmitButton'),
  username: document.querySelector('#username'),
  password: document.querySelector('#password'),
  authModeButtons: document.querySelectorAll('[data-auth-mode]'),
  taskForm: document.querySelector('#taskForm'),
  taskFormTitle: document.querySelector('#taskFormTitle'),
  taskId: document.querySelector('#taskId'),
  taskTitle: document.querySelector('#taskTitle'),
  taskDescription: document.querySelector('#taskDescription'),
  taskDeadline: document.querySelector('#taskDeadline'),
  taskPriority: document.querySelector('#taskPriority'),
  saveTaskButton: document.querySelector('#saveTaskButton'),
  cancelEditButton: document.querySelector('#cancelEditButton'),
  newTaskButton: document.querySelector('#newTaskButton'),
  searchInput: document.querySelector('#searchInput'),
  statusFilter: document.querySelector('#statusFilter'),
  priorityFilter: document.querySelector('#priorityFilter'),
  clearFiltersButton: document.querySelector('#clearFiltersButton'),
  taskList: document.querySelector('#taskList'),
  totalCount: document.querySelector('#totalCount'),
  pendingCount: document.querySelector('#pendingCount'),
  completedCount: document.querySelector('#completedCount'),
  highCount: document.querySelector('#highCount'),
  toast: document.querySelector('#toast')
};

function setLoading(button, loading, label) {
  button.disabled = loading;
  button.textContent = loading ? 'Please wait...' : label;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 2600);
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

function setAuthMode(mode) {
  state.authMode = mode;
  elements.authSubmitButton.textContent = mode === 'login' ? 'Login' : 'Create account';

  elements.authModeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.authMode === mode);
  });

  elements.password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
}

function showDashboard() {
  elements.authView.hidden = true;
  elements.dashboardView.hidden = false;
  elements.sessionPanel.hidden = false;
  elements.currentUser.textContent = state.user?.username || '';
}

function showAuth() {
  elements.authView.hidden = false;
  elements.dashboardView.hidden = true;
  elements.sessionPanel.hidden = true;
}

function logout() {
  state.token = null;
  state.user = null;
  state.tasks = [];
  localStorage.removeItem('smartTaskToken');
  resetTaskForm();
  showAuth();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  setLoading(elements.authSubmitButton, true, state.authMode === 'login' ? 'Login' : 'Create account');

  try {
    const data = await api(`/api/auth/${state.authMode}`, {
      method: 'POST',
      body: JSON.stringify({
        username: elements.username.value,
        password: elements.password.value
      })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('smartTaskToken', data.token);
    elements.authForm.reset();
    showDashboard();
    await loadTasks();
  } catch (error) {
    showToast(error.message);
  } finally {
    setLoading(elements.authSubmitButton, false, state.authMode === 'login' ? 'Login' : 'Create account');
  }
}

async function loadCurrentUser() {
  if (!state.token) {
    showAuth();
    return;
  }

  try {
    const data = await api('/api/auth/me');
    state.user = data.user;
    showDashboard();
    await loadTasks();
  } catch (error) {
    logout();
  }
}

function buildTaskQuery() {
  const params = new URLSearchParams();

  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return params.toString() ? `?${params.toString()}` : '';
}

async function loadTasks() {
  try {
    const data = await api(`/api/tasks${buildTaskQuery()}`);
    state.tasks = data.tasks;
    renderTasks();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  const editingId = elements.taskId.value;
  const payload = {
    title: elements.taskTitle.value,
    description: elements.taskDescription.value,
    deadline: elements.taskDeadline.value,
    priority: elements.taskPriority.value
  };

  setLoading(elements.saveTaskButton, true, 'Save task');

  try {
    await api(editingId ? `/api/tasks/${editingId}` : '/api/tasks', {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

    resetTaskForm();
    await loadTasks();
    showToast(editingId ? 'Task updated.' : 'Task added.');
  } catch (error) {
    showToast(error.message);
  } finally {
    setLoading(elements.saveTaskButton, false, 'Save task');
  }
}

async function toggleTaskStatus(taskId) {
  try {
    await api(`/api/tasks/${taskId}/complete`, { method: 'PATCH' });
    await loadTasks();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteTask(taskId) {
  const confirmed = window.confirm('Delete this task?');

  if (!confirmed) return;

  try {
    await api(`/api/tasks/${taskId}`, { method: 'DELETE' });
    await loadTasks();
    showToast('Task deleted.');
  } catch (error) {
    showToast(error.message);
  }
}

function editTask(task) {
  elements.taskId.value = task._id;
  elements.taskTitle.value = task.title;
  elements.taskDescription.value = task.description || '';
  elements.taskDeadline.value = toInputDate(task.deadline);
  elements.taskPriority.value = task.priority;
  elements.taskFormTitle.textContent = 'Edit Task';
  elements.cancelEditButton.hidden = false;
  elements.taskTitle.focus();
}

function resetTaskForm() {
  elements.taskForm.reset();
  elements.taskId.value = '';
  elements.taskPriority.value = 'Medium';
  elements.taskFormTitle.textContent = 'Add Task';
  elements.cancelEditButton.hidden = true;
}

function updateFilters() {
  state.filters.search = elements.searchInput.value.trim();
  state.filters.status = elements.statusFilter.value;
  state.filters.priority = elements.priorityFilter.value;
  loadTasks();
}

function clearFilters() {
  elements.searchInput.value = '';
  elements.statusFilter.value = '';
  elements.priorityFilter.value = '';
  updateFilters();
}

function renderTasks() {
  renderStats();
  elements.taskList.replaceChildren();

  if (!state.tasks.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No tasks found.';
    elements.taskList.append(emptyState);
    return;
  }

  state.tasks.forEach((task) => {
    elements.taskList.append(createTaskCard(task));
  });
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.status === 'Completed').length;
  const pending = state.tasks.filter((task) => task.status === 'Pending').length;
  const high = state.tasks.filter((task) => task.priority === 'High').length;

  elements.totalCount.textContent = total;
  elements.completedCount.textContent = completed;
  elements.pendingCount.textContent = pending;
  elements.highCount.textContent = high;
}

function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = `task-card priority-${task.priority.toLowerCase()} ${task.status === 'Completed' ? 'completed' : ''}`;

  const header = document.createElement('div');
  header.className = 'task-card-header';

  const title = document.createElement('h3');
  title.className = 'task-title';
  title.textContent = task.title;

  const statusBadge = document.createElement('span');
  statusBadge.className = `badge ${task.status.toLowerCase()}`;
  statusBadge.textContent = task.status;

  header.append(title, statusBadge);

  const description = document.createElement('p');
  description.className = 'task-description';
  description.textContent = task.description || 'No description.';

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const priority = document.createElement('span');
  priority.className = `badge ${task.priority.toLowerCase()}`;
  priority.textContent = task.priority;

  const deadline = document.createElement('span');
  deadline.textContent = `Due ${formatDate(task.deadline)}`;

  meta.append(priority, deadline);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const completeButton = document.createElement('button');
  completeButton.className = 'ghost-button compact';
  completeButton.type = 'button';
  completeButton.textContent = task.status === 'Completed' ? 'Mark pending' : 'Complete';
  completeButton.addEventListener('click', () => toggleTaskStatus(task._id));

  const editButton = document.createElement('button');
  editButton.className = 'ghost-button compact';
  editButton.type = 'button';
  editButton.textContent = 'Edit';
  editButton.addEventListener('click', () => editTask(task));

  const deleteButton = document.createElement('button');
  deleteButton.className = 'danger-button compact';
  deleteButton.type = 'button';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', () => deleteTask(task._id));

  actions.append(completeButton, editButton, deleteButton);
  card.append(header, description, meta, actions);

  return card;
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No date';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function toInputDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

elements.authModeButtons.forEach((button) => {
  button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});

elements.authForm.addEventListener('submit', handleAuthSubmit);
elements.logoutButton.addEventListener('click', logout);
elements.taskForm.addEventListener('submit', handleTaskSubmit);
elements.cancelEditButton.addEventListener('click', resetTaskForm);
elements.newTaskButton.addEventListener('click', () => {
  resetTaskForm();
  elements.taskTitle.focus();
});

elements.searchInput.addEventListener('input', () => {
  window.clearTimeout(state.debounceTimer);
  state.debounceTimer = window.setTimeout(updateFilters, 250);
});

elements.statusFilter.addEventListener('change', updateFilters);
elements.priorityFilter.addEventListener('change', updateFilters);
elements.clearFiltersButton.addEventListener('click', clearFilters);

setAuthMode(state.authMode);
loadCurrentUser();
