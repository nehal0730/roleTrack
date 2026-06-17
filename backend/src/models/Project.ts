import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'archived';

export interface ProjectAttributes {
  id: number;
  name: string;
  description?: string | null;
  start_date: Date;
  end_date: Date;
  status: ProjectStatus;
  manager_id: number;
  created_by: number;
  deleted_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}
interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id' | 'status'> {}

class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public start_date!: Date;
  public end_date!: Date;
  public status!: ProjectStatus;
  public manager_id!: number;
  public created_by!: number;
  public deleted_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Project.init({
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:        { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  start_date:  { type: DataTypes.DATEONLY, allowNull: false },
  end_date:    { type: DataTypes.DATEONLY, allowNull: false },
  status:      { type: DataTypes.ENUM('planning','active','completed','archived'), defaultValue: 'planning' },
  manager_id:  { type: DataTypes.INTEGER, allowNull: false },
  created_by:  { type: DataTypes.INTEGER, allowNull: false },
  deleted_at:  { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  tableName: 'projects',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  validate: {
  endAfterStart(this: Project) {
    if (
      new Date(this.end_date).getTime() <=
      new Date(this.start_date).getTime()
    ) {
      throw new Error('end_date must be after start_date');
    }
  },
},
});

export default Project;