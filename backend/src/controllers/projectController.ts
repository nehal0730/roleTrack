import { Response } from 'express';
import { Op }       from 'sequelize';
import { Project, Task, User } from '../models';
import { AuthRequest }    from '../middleware/auth';
import { createAuditLog } from '../middleware/auditLogger';

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { status, manager_id, page = 1, limit = 10 } = req.query;
    const where: any = {};

    if (req.user!.role === 'project_manager') where.manager_id = req.user!.id;
    if (status)     where.status     = status;
    if (manager_id && req.user!.role === 'admin') where.manager_id = manager_id;

    const { count, rows } = await Project.findAndCountAll({
      where,
      include: [
        { model: User, as: 'manager', attributes: ['id','name','email'] },
        { model: Task, as: 'tasks',   attributes: ['id','status'] },
      ],
      limit:  Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order:  [['created_at', 'DESC']],
    });

    res.json({ projects: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'manager', attributes: ['id','name','email'] },
        {
          model: Task, as: 'tasks',
          include: [{ model: User, as: 'assignee', attributes: ['id','name'] }],
        },
      ],
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (req.user!.role === 'project_manager' && project.manager_id !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(project);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, start_date, end_date, status, manager_id } = req.body;

    const manager = await User.findOne({ where: { id: manager_id, role_id: 2, is_active: true } });
    if (!manager) return res.status(400).json({ message: 'Invalid manager — user must be an active project manager' });

    const project = await Project.create({
      name, description, start_date, end_date,
      status:     status || 'planning',
      manager_id: Number(manager_id),
      created_by: req.user!.id,
    });

    await createAuditLog(req.user!.id, 'CREATE_PROJECT', 'project', project.id, null, { name, manager_id }, req.ip);
    res.status(201).json(project);
  } catch (err: any) {
    if (err.message?.includes('end_date')) return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user!.role === 'project_manager' && project.manager_id !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const previous = project.toJSON();
    await project.update(req.body);
    await createAuditLog(req.user!.id, 'UPDATE_PROJECT', 'project', project.id, previous, req.body, req.ip);
    res.json(project);
  } catch (err: any) {
    if (err.message?.includes('end_date')) return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await createAuditLog(req.user!.id, 'DELETE_PROJECT', 'project', project.id, project.toJSON(), null, req.ip);
    await project.destroy(); // soft delete via paranoid
    res.json({ message: 'Project archived (soft deleted)' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};