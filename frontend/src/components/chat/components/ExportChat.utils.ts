/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/

import { SegmentedControlProps } from '@cloudscape-design/components';
import { Chat, ChatMessage } from '../../../react-query-hooks';
import dayjs from '../../../types/dayjs';

export const DATETIMEFORMAT = 'YYYY-MM-DD HH:mm:ss';

export enum ExportFormat {
  text = 'text',
  json = 'json',
  csv = 'csv',
}

export const ExportFormatMime: Record<ExportFormat, string> = {
  text: 'text/plain',
  json: 'application/json',
  csv: 'text/csv',
};

export const ExportFormatExtension: Record<ExportFormat, string> = {
  text: 'txt',
  json: 'json',
  csv: 'csv',
};

export const exportFormatOptions: SegmentedControlProps.Option[] = Object.keys(ExportFormat).map((format) => ({
  id: format,
  text: format.toUpperCase(),
}));

export interface ChatExport {
  readonly chat: Omit<Chat, 'userId' | 'createdAt'> & {
    readonly createdAt?: string;
  };
  readonly messages: (Omit<ChatMessage, 'createdAt' | 'chatId'> & {
    readonly createdAt?: string;
  })[];

  readonly modelKwargs?: any;
  readonly llmInfo?: string;
}

export interface ChatExportHelperOptions {
  readonly chat: Chat;
  readonly messages: ChatMessage[];
}

export class ChatExportHelper {
  static from(options: ChatExportHelperOptions) {
    return new ChatExportHelper(options);
  }

  private readonly chatExport: ChatExport;

  private constructor(options: ChatExportHelperOptions) {
    const { chat, messages } = options;
    this.chatExport = {
      chat: {
        chatId: chat.chatId,
        title: chat.title,
        createdAt: chat.createdAt == null ? undefined : dayjs(chat.createdAt).format(DATETIMEFORMAT),
      },
      messages: messages.map((msg) => ({
        messageId: msg.messageId,
        text: msg.text,
        type: msg.type,
        createdAt: chat.createdAt == null ? undefined : dayjs(msg.createdAt).format(DATETIMEFORMAT),
      })),
    };
  }

  getCsv() {
    const txt = [];
    txt.push(
      `messageId,createdAt,type,text${this.chatExport.llmInfo ? ',llmInfo' : ''}${
        this.chatExport.modelKwargs ? `,${Object.keys(this.chatExport.modelKwargs).join(',')}` : ''
      }`,
    );
    for (const msg of this.chatExport.messages) {
      txt.push(
        `${msg.messageId},${msg.createdAt ?? ''},${msg.type},"${msg.text.replace(/\n/g, '\\n')}"${
          this.chatExport.llmInfo ? `,"${this.chatExport.llmInfo}"` : ''
        }${this.chatExport.modelKwargs ? `,${Object.values(this.chatExport.modelKwargs).join(',')}` : ''}`,
      );
    }

    return txt.join('\n');
  }

  getText() {
    const txt = [];

    this.chatExport.chat.createdAt && txt.push(`Chat created at: ${this.chatExport.chat.createdAt}`);
    txt.push(`${this.chatExport.chat.title}`);
    txt.push('');

    if (this.chatExport.llmInfo) {
      txt.push(`LLM info: ${this.chatExport.llmInfo}`);
    }

    if (this.chatExport.modelKwargs) {
      txt.push(`Model Kwargs: ${JSON.stringify(this.chatExport.modelKwargs)}`);
    }

    if (this.chatExport.llmInfo || this.chatExport.modelKwargs) {
      txt.push('');
    }

    for (const msg of this.chatExport.messages) {
      txt.push(`${msg.createdAt && `[${msg.createdAt}]`}[${msg.type}]`);
      txt.push(msg.text);
      txt.push('');
      if (msg.type !== 'human') {
        txt.push('');
      }
    }

    return txt.join('\n');
  }
  getJson() {
    return JSON.stringify(this.chatExport, null, 2);
  }
}
