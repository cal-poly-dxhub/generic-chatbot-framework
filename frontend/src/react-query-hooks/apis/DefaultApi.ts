/* tslint:disable */
/* eslint-disable */
/**
 * MyApi
 * A sample smithy api
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import type {
  CreateChatMessageRequestContent,
  CreateChatMessageResponseContent,
  CreateChatRequestContent,
  CreateChatResponseContent,
  DeleteChatMessageResponseContent,
  DeleteChatResponseContent,
  ListChatMessageSourcesResponseContent,
  ListChatMessagesResponseContent,
  ListChatsResponseContent,
  UpdateChatRequestContent,
  UpdateChatResponseContent,
  UpdateFeedbackRequestContent,
  UpdateFeedbackResponseContent,
  LoadExemptionTreeResponseContent,
  CloseExemptionResponseContent,
  CloseExemptionRequestContent,
} from '../models';
import {
    CreateChatMessageRequestContentToJSON,
    CreateChatMessageResponseContentFromJSON,
    CreateChatRequestContentToJSON,
    CreateChatResponseContentFromJSON,
    DeleteChatMessageResponseContentFromJSON,
    DeleteChatResponseContentFromJSON,
    ListChatMessageSourcesResponseContentFromJSON,
    ListChatMessagesResponseContentFromJSON,
    ListChatsResponseContentFromJSON,
    UpdateChatRequestContentToJSON,
    UpdateChatResponseContentFromJSON,
    UpdateFeedbackRequestContentToJSON,
    UpdateFeedbackResponseContentFromJSON,
    LoadExemptionTreeResponseContentFromJSON,
    CloseExemptionResponseContentFromJSON,
    CloseExemptionRequestContentToJSON,
} from '../models';

export interface CreateChatRequest {
    createChatRequestContent: CreateChatRequestContent;
}

export interface CreateChatMessageRequest {
    chatId: string;
    createChatMessageRequestContent: CreateChatMessageRequestContent;
}

export interface DownloadFeedbackRequest {}

export interface DeleteChatRequest {
    chatId: string;
}

export interface DeleteChatMessageRequest {
    chatId: string;
    messageId: string;
}

export interface ListChatMessageSourcesRequest {
    chatId: string;
    messageId: string;
    nextToken?: string;
    pageSize?: number;
}

export interface ListChatMessagesRequest {
    chatId: string;
    nextToken?: string;
    pageSize?: number;
    ascending?: boolean;
    reverse?: boolean;
}


export interface UpdateChatRequest {
    chatId: string;
    updateChatRequestContent: UpdateChatRequestContent;
}

export interface UpdateFeedbackRequest {
    // TODO: Is this duplicated data?
    chatId: string;
    updateFeedbackRequestContent: UpdateFeedbackRequestContent;
}

export interface LoadExemptionTreeRequest {
    chatId: string;
}

export interface CloseExemptionRequest {
    chatId: string;
    closeExemptionRequestContent: CloseExemptionRequestContent;
}

/**
 * 
 */
export class DefaultApi extends runtime.BaseAPI {

    /**
     */
    async createChatRaw(requestParameters: CreateChatRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<CreateChatResponseContent>> {
        if (requestParameters.createChatRequestContent === null || requestParameters.createChatRequestContent === undefined) {
            throw new runtime.RequiredError('createChatRequestContent','Required parameter requestParameters.createChatRequestContent was null or undefined when calling createChat.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/chat`,
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: CreateChatRequestContentToJSON(requestParameters.createChatRequestContent),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => CreateChatResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async createChat(requestParameters: CreateChatRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CreateChatResponseContent> {
        const response = await this.createChatRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async createChatMessageRaw(requestParameters: CreateChatMessageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<CreateChatMessageResponseContent>> {
        if (requestParameters.chatId === null || requestParameters.chatId === undefined) {
            throw new runtime.RequiredError('chatId','Required parameter requestParameters.chatId was null or undefined when calling createChatMessage.');
        }

        if (requestParameters.createChatMessageRequestContent === null || requestParameters.createChatMessageRequestContent === undefined) {
            throw new runtime.RequiredError('createChatMessageRequestContent','Required parameter requestParameters.createChatMessageRequestContent was null or undefined when calling createChatMessage.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/inference/{chatId}/message`.replace(`{${"chatId"}}`, encodeURIComponent(String(requestParameters.chatId))),
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: CreateChatMessageRequestContentToJSON(requestParameters.createChatMessageRequestContent),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => CreateChatMessageResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async createChatMessage(requestParameters: CreateChatMessageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CreateChatMessageResponseContent> {
        const response = await this.createChatMessageRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async deleteChatRaw(requestParameters: DeleteChatRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<DeleteChatResponseContent>> {
        if (requestParameters.chatId === null || requestParameters.chatId === undefined) {
            throw new runtime.RequiredError('chatId','Required parameter requestParameters.chatId was null or undefined when calling deleteChat.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/chat/{chatId}`.replace(`{${"chatId"}}`, encodeURIComponent(String(requestParameters.chatId))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => DeleteChatResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async deleteChat(requestParameters: DeleteChatRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<DeleteChatResponseContent> {
        const response = await this.deleteChatRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async deleteChatMessageRaw(requestParameters: DeleteChatMessageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<DeleteChatMessageResponseContent>> {
        if (requestParameters.chatId === null || requestParameters.chatId === undefined) {
            throw new runtime.RequiredError('chatId','Required parameter requestParameters.chatId was null or undefined when calling deleteChatMessage.');
        }

        if (requestParameters.messageId === null || requestParameters.messageId === undefined) {
            throw new runtime.RequiredError('messageId','Required parameter requestParameters.messageId was null or undefined when calling deleteChatMessage.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/chat/{chatId}/message/{messageId}`.replace(`{${"chatId"}}`, encodeURIComponent(String(requestParameters.chatId))).replace(`{${"messageId"}}`, encodeURIComponent(String(requestParameters.messageId))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => DeleteChatMessageResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async deleteChatMessage(requestParameters: DeleteChatMessageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<DeleteChatMessageResponseContent> {
        const response = await this.deleteChatMessageRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async listChatMessageSourcesRaw(requestParameters: ListChatMessageSourcesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ListChatMessageSourcesResponseContent>> {
        if (requestParameters.chatId === null || requestParameters.chatId === undefined) {
            throw new runtime.RequiredError('chatId','Required parameter requestParameters.chatId was null or undefined when calling listChatMessageSources.');
        }

        if (requestParameters.messageId === null || requestParameters.messageId === undefined) {
            throw new runtime.RequiredError('messageId','Required parameter requestParameters.messageId was null or undefined when calling listChatMessageSources.');
        }

        const queryParameters: any = {};

        if (requestParameters.nextToken !== undefined) {
            queryParameters['nextToken'] = requestParameters.nextToken;
        }

        if (requestParameters.pageSize !== undefined) {
            queryParameters['pageSize'] = requestParameters.pageSize;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/chat/{chatId}/message/{messageId}/source`.replace(`{${"chatId"}}`, encodeURIComponent(String(requestParameters.chatId))).replace(`{${"messageId"}}`, encodeURIComponent(String(requestParameters.messageId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ListChatMessageSourcesResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async listChatMessageSources(requestParameters: ListChatMessageSourcesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ListChatMessageSourcesResponseContent> {
        const response = await this.listChatMessageSourcesRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async listChatMessagesRaw(requestParameters: ListChatMessagesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ListChatMessagesResponseContent>> {
        if (requestParameters.chatId === null || requestParameters.chatId === undefined) {
            throw new runtime.RequiredError('chatId','Required parameter requestParameters.chatId was null or undefined when calling listChatMessages.');
        }

        const queryParameters: any = {};

        if (requestParameters.nextToken !== undefined) {
            queryParameters['nextToken'] = requestParameters.nextToken;
        }

        if (requestParameters.pageSize !== undefined) {
            queryParameters['pageSize'] = requestParameters.pageSize;
        }

        if (requestParameters.ascending !== undefined) {
            queryParameters['ascending'] = requestParameters.ascending;
        }

        if (requestParameters.reverse !== undefined) {
            queryParameters['reverse'] = requestParameters.reverse;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/chat/{chatId}`.replace(`{${"chatId"}}`, encodeURIComponent(String(requestParameters.chatId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ListChatMessagesResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async listChatMessages(requestParameters: ListChatMessagesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ListChatMessagesResponseContent> {
        const response = await this.listChatMessagesRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async listChatsRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ListChatsResponseContent>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/chat`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ListChatsResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async listChats(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ListChatsResponseContent> {
        const response = await this.listChatsRaw(initOverrides);
        return await response.value();
    }

    /**
     */
    async updateChatRaw(requestParameters: UpdateChatRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<UpdateChatResponseContent>> {
        if (requestParameters.chatId === null || requestParameters.chatId === undefined) {
            throw new runtime.RequiredError('chatId','Required parameter requestParameters.chatId was null or undefined when calling updateChat.');
        }

        if (requestParameters.updateChatRequestContent === null || requestParameters.updateChatRequestContent === undefined) {
            throw new runtime.RequiredError('updateChatRequestContent','Required parameter requestParameters.updateChatRequestContent was null or undefined when calling updateChat.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/chat/{chatId}`.replace(`{${"chatId"}}`, encodeURIComponent(String(requestParameters.chatId))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: UpdateChatRequestContentToJSON(requestParameters.updateChatRequestContent),
        }, initOverrides);
        console.log("initOverrides: ", initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => UpdateChatResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async updateChat(requestParameters: UpdateChatRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<UpdateChatResponseContent> {
        const response = await this.updateChatRaw(requestParameters, initOverrides);
        return await response.value();
    }

    async downloadFeedbackRaw(
        initOverrides?: RequestInit | runtime.InitOverrideFunction
    ): Promise<runtime.ApiResponse<Blob>> {
        const queryParameters: any = {};
        const headerParameters: runtime.HTTPHeaders = {
            'Accept': 'text/plain', 
        };

        const response = await this.request({
            path: `feedback/download`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.BlobApiResponse(response);
    }

    async downloadFeedback(
        initOverrides?: RequestInit | runtime.InitOverrideFunction
    ): Promise<Blob> {
        const response = await this.downloadFeedbackRaw(initOverrides);
        return await response.value();
    }
    /**
     */
    async updateFeedbackRaw(requestParameters: UpdateFeedbackRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<UpdateFeedbackResponseContent>> {
        console.log("updateFeedback requestParameters: ", requestParameters);
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const chatId = requestParameters.chatId;
        const messageId = requestParameters.updateFeedbackRequestContent.messageId;

        const body = UpdateFeedbackRequestContentToJSON(requestParameters.updateFeedbackRequestContent);

        console.log("updateFeedback body: ", body);

        const path = `/chat/{chatId}/message/{messageId}/feedback`.replace(`{${"chatId"}}`, encodeURIComponent(String(chatId))).replace(`{${"messageId"}}`, encodeURIComponent(String(messageId)));

        console.log("updateFeedback path: ", path);

        const response = await this.request({
            path: path,
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: body,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => UpdateFeedbackResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async updateFeedback(requestParameters: UpdateFeedbackRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<UpdateFeedbackResponseContent> {
        const response = await this.updateFeedbackRaw(requestParameters, initOverrides);
        return await response.value();
    }
    /**
     */
    async loadExemptionTreeRaw(requestParameters: LoadExemptionTreeRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<LoadExemptionTreeResponseContent>> {
        if (requestParameters.chatId === null || requestParameters.chatId === undefined) {
            throw new runtime.RequiredError('chatId','Required parameter requestParameters.chatId was null or undefined when calling loadExemptionTree.');
        }

        console.log("Rerunning loadExemptionTree: ", requestParameters.chatId);

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const path = `/chat/{chatId}/exemption-tree`.replace(`{${"chatId"}}`, encodeURIComponent(String(requestParameters.chatId)));

        const response = await this.request({
            path: path,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => LoadExemptionTreeResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async loadExemptionTree(requestParameters: LoadExemptionTreeRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<LoadExemptionTreeResponseContent> {
        const response = await this.loadExemptionTreeRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async closeExemptionRaw(request: CloseExemptionRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<CloseExemptionResponseContent>> {
        if (request.chatId === null || request.chatId === undefined) {
            throw new runtime.RequiredError('chatId','Required parameter request.chatId was null or undefined when calling closeExemption.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const path = `/chat/{chatId}/exemption-tree`.replace(`{${"chatId"}}`, encodeURIComponent(String(request.chatId)));

        const response = await this.request({
            path: path,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: CloseExemptionRequestContentToJSON(request.closeExemptionRequestContent),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => CloseExemptionResponseContentFromJSON(jsonValue));
    }

    /**
     */
    async closeExemption(request: CloseExemptionRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CloseExemptionResponseContent> {
        const response = await this.closeExemptionRaw(request, initOverrides);
        return await response.value();
    }
}
