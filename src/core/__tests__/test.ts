import execSh from 'exec-sh';
import path from 'path';
import { ChildProcess } from 'child_process';
import { mock as jestMock, mockReset } from 'jest-mock-extended';
import { Readable } from 'stream';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import fs from 'fs';

import * as specmatic from '../..';
import { specmaticJarName } from '../../config';

jest.mock('exec-sh');
jest.mock('node-fetch');

const SPECMATIC_JAR_PATH = path.resolve(__dirname, '..', '..', '..', specmaticJarName);
const CONTRACT_FILE_PATH = './contracts';
const HOST = 'localhost';
const PORT = 8000;

const javaProcessMock = jestMock<ChildProcess>();
const readableMock = jestMock<Readable>();
javaProcessMock.stdout = readableMock;
javaProcessMock.stderr = readableMock;

beforeEach(() => {
    execSh.mockReset();
    mockReset(javaProcessMock);
    mockReset(readableMock);
});

test('runs the contract tests', async function () {
    execSh.mockReturnValue(javaProcessMock);
    setTimeout(() => {
        copyReportFile();
        execSh.mock.calls[0][2]();
    }, 0);

    await expect(specmatic.test(HOST, PORT, CONTRACT_FILE_PATH)).resolves.toBeTruthy();

    expect(execSh).toHaveBeenCalledTimes(1);
    expect(execSh.mock.calls[0][0]).toBe(
        `java -jar ${path.resolve(SPECMATIC_JAR_PATH)} test ${path.resolve(
            CONTRACT_FILE_PATH
        )} --junitReportDir=dist/test-report --host=${HOST} --port=${PORT}`
    );
});

test('takes additional pass through arguments', async () => {
    execSh.mockReturnValue(javaProcessMock);
    setTimeout(() => {
        copyReportFile();
        execSh.mock.calls[0][2]();
    }, 0);

    await expect(specmatic.test(HOST, PORT, CONTRACT_FILE_PATH, ['P1', 'P2'])).resolves.toBeTruthy();

    expect(execSh).toHaveBeenCalledTimes(1);
    expect(execSh.mock.calls[0][0]).toBe(
        `java -jar ${path.resolve(SPECMATIC_JAR_PATH)} test ${path.resolve(
            CONTRACT_FILE_PATH
        )} --junitReportDir=dist/test-report --host=${HOST} --port=${PORT} P1 P2`
    );
});

test('additional pass through arguments can be string or number', async () => {
    execSh.mockReturnValue(javaProcessMock);
    setTimeout(() => {
        copyReportFile();
        execSh.mock.calls[0][2]();
    }, 0);

    await expect(specmatic.test(HOST, PORT, CONTRACT_FILE_PATH, ['P1', 123])).resolves.toBeTruthy();

    expect(execSh).toHaveBeenCalledTimes(1);
    expect(execSh.mock.calls[0][0]).toBe(
        `java -jar ${path.resolve(SPECMATIC_JAR_PATH)} test ${path.resolve(
            CONTRACT_FILE_PATH
        )} --junitReportDir=dist/test-report --host=${HOST} --port=${PORT} P1 123`
    );
});

test('runs the contract tests with host and port optional', async function () {
    execSh.mockReturnValue(javaProcessMock);
    setTimeout(() => {
        copyReportFile();
        execSh.mock.calls[0][2]();
    }, 0);

    await expect(specmatic.test()).resolves.toBeTruthy();

    expect(execSh).toHaveBeenCalledTimes(1);
    expect(execSh.mock.calls[0][0]).toBe(`java -jar ${path.resolve(SPECMATIC_JAR_PATH)} test --junitReportDir=dist/test-report`);
});

test('runs the contract tests with contracts path optional', async function () {
    execSh.mockReturnValue(javaProcessMock);
    setTimeout(() => {
        copyReportFile();
        execSh.mock.calls[0][2]();
    }, 0);

    await expect(specmatic.test(HOST, PORT)).resolves.toBeTruthy();

    expect(execSh).toHaveBeenCalledTimes(1);
    expect(execSh.mock.calls[0][0]).toBe(
        `java -jar ${path.resolve(SPECMATIC_JAR_PATH)} test --junitReportDir=dist/test-report --host=${HOST} --port=${PORT}`
    );
});

test('runs the contract tests and returns a summary', async function () {
    execSh.mockReturnValue(javaProcessMock);
    setTimeout(() => {
        copyReportFile();
        execSh.mock.calls[0][2]();
    }, 0);

    await expect(specmatic.test()).resolves.toStrictEqual({
        total: 5,
        success: 3,
        failure: 2,
    });
});

test('runs the contract tests and returns a summary with skipped tests count included', async function () {
    execSh.mockReturnValue(javaProcessMock);
    setTimeout(() => {
        copyReportFileWithName('sample-junit-result-skipped.xml');
        execSh.mock.calls[0][2]();
    }, 0);

    await expect(specmatic.test()).resolves.toStrictEqual({
        total: 3,
        success: 2,
        failure: 1,
    });
});

test('runs the contract tests and get summary when there is just one test', async function () {
    execSh.mockReturnValue(javaProcessMock);
    setTimeout(() => {
        copyReportFileWithName('sample-junit-result-single.xml');
        execSh.mock.calls[0][2]();
    }, 0);

    await expect(specmatic.test()).resolves.toStrictEqual({
        total: 1,
        success: 1,
        failure: 0,
    });
});

test('invocation makes sure previous junit report if any is deleted', async function () {
    const spy = jest.spyOn(fs, 'rmSync');
    execSh.mockReturnValue(javaProcessMock);
    setTimeout(() => {
        copyReportFileWithName('sample-junit-result-single.xml');
        execSh.mock.calls[0][2]();
    }, 0);

    await specmatic.test();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(path.resolve('dist/test-report'), { force: true, recursive: true });
});

function copyReportFile() {
    copyReportFileWithName('sample-junit-result-multiple.xml');
}

function copyReportFileWithName(fileName: string) {
    const destDir = path.resolve('dist/test-report');
    if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
    }
    const srcPath = path.resolve('test-resources', fileName);
    const destPath = path.resolve(destDir, 'TEST-junit-jupiter.xml');
    copyFileSync(srcPath, destPath);
}