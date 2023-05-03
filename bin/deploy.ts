#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { ExampleStack } from "../stack/ExampleStack";
import dotenv from 'dotenv';

dotenv.config();

const app = new App();

const base = new ExampleStack(app, 'example-cdk-stack', {
  app: 'SampleApp'
});
