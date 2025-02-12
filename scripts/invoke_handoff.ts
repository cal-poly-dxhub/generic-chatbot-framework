import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { writeFile } from 'fs/promises';
import * as readline from 'readline';

// RUN THIS WITH tsx scripts/invoke_api.ts

// POPULATE THESE -------

const region = 'us-east-2';
const stage = 'test';
const apiId = '<apiId>';
const userId = '<userId>';
const chatId = '<chatId>';
const path = `/chat/${chatId}/user/${userId}/handoff`;
const endpoint = `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/${path}`;

const clientId = '<clientId>';
const username = '<username>';
const password = '<password>';

// ----------------------

async function getCognitoToken() {
    const client = new CognitoIdentityProviderClient({ region });
    const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
        },
    });

    try {
        const response = await client.send(command);

        console.log('Response:', response);

        if (response.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
            const mfaCode = await promptForMfaCode();
            const challengeResponse = new RespondToAuthChallengeCommand({
                ClientId: clientId,
                ChallengeName: 'SOFTWARE_TOKEN_MFA',
                Session: response.Session,
                ChallengeResponses: {
                    USERNAME: username,
                    SOFTWARE_TOKEN_MFA_CODE: mfaCode,
                },
            });
            const challengeResponseResult = await client.send(challengeResponse);

            console.log('Challenge Response:', challengeResponseResult);
            return challengeResponseResult.AuthenticationResult?.IdToken;
        }

        return response.AuthenticationResult?.IdToken;
    } catch (error) {
        console.error('Error authenticating with Cognito:', error);
        throw error;
    }
}

function promptForMfaCode(): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question('Enter MFA code: ', (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function invokeApi(idToken: string) {
    const { default: fetch } = await import('node-fetch');
    const credentials = defaultProvider();
    const signer = new SignatureV4({
        credentials,
        region,
        service: 'execute-api',
        sha256: Sha256,
    });

    const request = new HttpRequest({
        method: 'GET',
        hostname: endpoint.replace('https://', '').split('/')[0],
        path: endpoint.replace('https://', '').split('/').slice(1).join('/'),
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
            Host: endpoint.replace('https://', '').split('/')[0], // Add Host header
        },
    });

    const signedRequest = await signer.sign(request);

    const url = `${signedRequest.protocol}//${signedRequest.hostname}${signedRequest.path}`;

    try {
        const response = await fetch(url, {
            method: signedRequest.method,
            headers: signedRequest.headers,
        });
        const responseBody = await response.json();
        console.log('API Response:', responseBody);
        await writeFile(
            'scripts/handoff_response.json',
            JSON.stringify(responseBody, null, 2)
        );
        console.log('Response saved to scripts/handoff_response.json');
    } catch (error) {
        console.error('Error invoking API:', error);
    }
}

async function main() {
    try {
        const idToken = await getCognitoToken();
        console.log('ID Token:', idToken);
        await invokeApi(idToken ?? 'explode');
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
