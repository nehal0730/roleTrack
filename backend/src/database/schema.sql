CREATE DATABASE IF NOT EXISTS task_manager;
USE task_manager;

CREATE TABLE roles (
  id   INT PRIMARY KEY AUTO_INCREMENT,
  name ENUM('admin','project_manager','employee') NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  name             VARCHAR(100)  NOT NULL,
  email            VARCHAR(150)  NOT NULL UNIQUE,
  password_hash    VARCHAR(255)  NOT NULL,
  role_id          INT           NOT NULL,
  is_active        BOOLEAN       DEFAULT TRUE,
  reset_token      VARCHAR(255)  NULL,
  reset_token_expiry TIMESTAMP   NULL,
  deleted_at       TIMESTAMP     NULL,
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_users_email     (email),
  INDEX idx_users_role_id   (role_id),
  INDEX idx_users_deleted_at(deleted_at)
);

CREATE TABLE projects (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  status      ENUM('planning','active','completed','archived') DEFAULT 'planning',
  manager_id  INT          NOT NULL,
  created_by  INT          NOT NULL,
  deleted_at  TIMESTAMP    NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_projects_manager_id (manager_id),
  INDEX idx_projects_status     (status),
  INDEX idx_projects_deleted_at (deleted_at)
);

CREATE TABLE tasks (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  project_id      INT           NOT NULL,
  title           VARCHAR(200)  NOT NULL,
  description     TEXT,
  priority        ENUM('low','medium','high','critical') DEFAULT 'medium',
  status          ENUM('todo','in_progress','in_review','completed','blocked') DEFAULT 'todo',
  deadline        DATETIME      NOT NULL,
  assigned_to     INT           NULL,
  created_by      INT           NOT NULL,
  estimated_hours DECIMAL(5,2)  DEFAULT 0,
  deleted_at      TIMESTAMP     NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)  REFERENCES users(id),
  INDEX idx_tasks_project_id  (project_id),
  INDEX idx_tasks_assigned_to (assigned_to),
  INDEX idx_tasks_status      (status),
  INDEX idx_tasks_priority    (priority),
  INDEX idx_tasks_deadline    (deadline),
  INDEX idx_tasks_deleted_at  (deleted_at)
);

CREATE TABLE task_assignments (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  task_id     INT  NOT NULL,
  assigned_to INT  NOT NULL,
  assigned_by INT  NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unassigned_at TIMESTAMP NULL,
  notes       VARCHAR(500) NULL,
  FOREIGN KEY (task_id)     REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  INDEX idx_ta_task_id     (task_id),
  INDEX idx_ta_assigned_to (assigned_to),
  INDEX idx_ta_assigned_at (assigned_at)
);

CREATE TABLE task_history (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  task_id    INT          NOT NULL,
  changed_by INT          NOT NULL,
  field      VARCHAR(50)  NOT NULL,
  old_value  VARCHAR(255) NULL,
  new_value  VARCHAR(255) NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id)    REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_th_task_id    (task_id),
  INDEX idx_th_changed_by (changed_by),
  INDEX idx_th_created_at (created_at)
);

CREATE TABLE work_logs (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  task_id        INT          NOT NULL,
  user_id        INT          NOT NULL,
  description    TEXT         NOT NULL,
  hours_worked   DECIMAL(4,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  attachment_url VARCHAR(500) NULL,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_wl_task_id    (task_id),
  INDEX idx_wl_user_id    (user_id),
  INDEX idx_wl_created_at (created_at)
);

CREATE TABLE log_replies (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  log_id     INT  NOT NULL,
  user_id    INT  NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (log_id)  REFERENCES work_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_lr_log_id (log_id)
);

CREATE TABLE notifications (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  user_id    INT  NOT NULL,
  task_id    INT  NULL,
  type       ENUM('deadline_48h','deadline_24h','deadline_12h','deadline_1h','overdue','assignment','reply') NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN   DEFAULT FALSE,
  sent_at    TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  INDEX idx_notif_user_id (user_id),
  INDEX idx_notif_task_id (task_id),
  INDEX idx_notif_type    (type),
  INDEX idx_notif_is_read (is_read),
  INDEX idx_notif_task_type (task_id, type)
);

CREATE TABLE audit_logs (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  user_id        INT          NOT NULL,
  action         VARCHAR(100) NOT NULL,
  entity_type    VARCHAR(50)  NOT NULL,
  entity_id      INT          NOT NULL,
  previous_value JSON         NULL,
  new_value      JSON         NULL,
  ip_address     VARCHAR(45)  NULL,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_al_user_id     (user_id),
  INDEX idx_al_entity      (entity_type, entity_id),
  INDEX idx_al_created_at  (created_at)
);

INSERT INTO roles (name) VALUES ('admin'),('project_manager'),('employee');

INSERT INTO users (name, email, password_hash, role_id)
VALUES ('Super Admin','admin@taskmanager.com',
'$2b$12$/yIkUby6v/B/YzVnp0ftOup5/0dVt9IoglTauVI0A8VrwjodxP1fy', 1);