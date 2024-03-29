#!/usr/bin/env node
import { App, Aspects, RemovalPolicy, Resource } from "aws-cdk-lib";
import { ExampleStack } from "../stack/ExampleStack";
import dotenv from 'dotenv';
import { ResourceAspect } from "./ResourceAspect";

dotenv.config();

const app = new App();
const appName = 'SampleApp';
const base = new ExampleStack(app, 'example-cdk-stack', {
  app: appName
});

Aspects.of(app).add(new ResourceAspect({
  removalPolicy: RemovalPolicy.DESTROY,
  app: appName
}));
