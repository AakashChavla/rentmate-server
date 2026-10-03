import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../config/default-app-config.service';
import { databaseOptions } from './database-options';
export default new DataSource(databaseOptions(new AppConfigService()));
