import { Agent } from '../';
import { Janus, JanusInstance, PluginHandle } from 'janus-gateway';
import { EventEmitter } from 'events';
import { JanusError } from '../types/errors';
import { JanusServiceEvents } from '../types/events';
import StrictEventEmitter from '../lib/StrictEventEmitter';

export class JanusService extends (EventEmitter as {
    new (): StrictEventEmitter<EventEmitter, JanusServiceEvents>;
}) {
    private janus?: JanusInstance;
    private agent: Agent;
    private roomId: string | null = null;
    private publisherId: string | null = null;
    private pluginHandle?: PluginHandle;

    constructor(agent: Agent, janusUrl: string) {
        super();
        this.agent = agent;
        this.initJanus(janusUrl);
    }

    private initJanus(janusUrl: string): void {
        Janus.init({
            debug: true,
            callback: () => {
                this.janus = new Janus({
                    server: janusUrl,
                    success: () => {
                        console.log('Janus initialized successfully');
                    },
                    error: (error: any) => {
                        console.error('Janus initialization failed:', error);
                    }
                });
            }
        });
    }

    public async createVideoRoom(roomConfig: {
        room?: number,
        description?: string,
        publishers?: number,
        bitrate?: number
    }): Promise<string> {
        return new Promise((resolve, reject) => {
            this.janus?.attach({
                plugin: 'janus.plugin.videoroom',
                success: (pluginHandle: PluginHandle) => {
                    const create = {
                        request: 'create',
                        ...roomConfig
                    };

                    pluginHandle.send({
                        message: create,
                        success: (response: any) => {
                            this.roomId = response.room;
                            resolve(this.roomId);
                        },
                        error: reject
                    });
                },
                error: reject
            });
        });
    }

    public async joinRoom(roomId: string, displayName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.janus?.attach({
                plugin: 'janus.plugin.videoroom',
                success: (pluginHandle: PluginHandle) => {
                    const join = {
                        request: 'join',
                        room: roomId,
                        ptype: 'publisher',
                        display: displayName
                    };

                    pluginHandle.send({
                        message: join,
                        success: (response: any) => {
                            this.publisherId = response.id;
                            resolve();
                        },
                        error: reject
                    });
                },
                error: reject
            });
        });
    }

    public async publishStream(stream: MediaStream): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.publisherId || !this.roomId) {
                reject(new Error('Must join room before publishing'));
                return;
            }

            this.janus?.attach({
                plugin: 'janus.plugin.videoroom',
                success: (pluginHandle: PluginHandle) => {
                    pluginHandle.createOffer({
                        media: { 
                            audioRecv: false,
                            videoRecv: false,
                            audioSend: true,
                            videoSend: true 
                        },
                        stream: stream,
                        success: (jsep: any) => {
                            const publish = {
                                request: 'publish',
                                audio: true,
                                video: true
                            };

                            pluginHandle.send({
                                message: publish,
                                jsep: jsep,
                                success: resolve,
                                error: reject
                            });
                        },
                        error: reject
                    });
                },
                error: reject
            });
        });
    }

    public async subscribeToFeed(publisherId: string): Promise<MediaStream> {
        return new Promise((resolve, reject) => {
            this.janus?.attach({
                plugin: 'janus.plugin.videoroom',
                success: (pluginHandle: PluginHandle) => {
                    const subscribe = {
                        request: 'join',
                        room: this.roomId,
                        ptype: 'subscriber',
                        feed: publisherId
                    };

                    pluginHandle.send({
                        message: subscribe,
                        success: (response: any) => {
                            // Handle the subscription response
                            pluginHandle.createAnswer({
                                jsep: response.jsep,
                                media: { 
                                    audioSend: false,
                                    videoSend: false 
                                },
                                success: (jsep: any) => {
                                    const start = { request: 'start' };
                                    pluginHandle.send({
                                        message: start,
                                        jsep: jsep
                                    });
                                }
                            });
                        },
                        error: reject
                    });
                },
                onremotestream: (stream: MediaStream) => {
                    resolve(stream);
                },
                error: reject
            });
        });
    }

    public async cleanup(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.pluginHandle) {
                this.pluginHandle.send({
                    message: { request: 'leave' },
                    success: () => {
                        if (this.janus) {
                            this.janus.destroy({
                                success: () => {
                                    this.janus = undefined;
                                    this.pluginHandle = undefined;
                                    this.roomId = null;
                                    this.publisherId = null;
                                    resolve();
                                },
                                error: reject
                            });
                        } else {
                            resolve();
                        }
                    },
                    error: reject
                });
            } else if (this.janus) {
                this.janus.destroy({
                    success: () => {
                        this.janus = undefined;
                        resolve();
                    },
                    error: reject
                });
            } else {
                resolve();
            }
        });
    }

    private handleParticipantEvent(event: any): void {
        if (event.joining) {
            this.emit('participant-joined', event.id, event.display);
        } else if (event.leaving) {
            this.emit('participant-left', event.id);
        }
    }

    private attachEventHandlers(pluginHandle: PluginHandle): void {
        pluginHandle.on('message', (msg: any) => {
            if (msg.videoroom === 'event') {
                this.handleParticipantEvent(msg);
            }
        });

        pluginHandle.on('error', (error: any) => {
            this.emit('error', new JanusError(error.message, error.code));
        });
    }

    private handleError(error: any): Error {
        if (error instanceof Error) {
            return error;
        }
        
        if (typeof error === 'string') {
            return new JanusError(error);
        }
        
        if (error.code) {
            return new JanusError(error.message || 'Unknown Janus error', error.code);
        }
        
        return new JanusError('Unknown error occurred');
    }

    private emitError(error: any): void {
        const processedError = this.handleError(error);
        this.emit('error', processedError);
    }
} 