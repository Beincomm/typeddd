import { Final } from '@beincom/common';
import { AggregateRoot } from '../entities';
import { DomainEvent } from './domain-event';
import { LoggerPort } from '../interfaces/ports';
import { UUIDValueObject } from '../value-objects';
import { IDomainEvent } from '../interfaces/domain';
import { DomainEventHandler } from './domain-event.handler';

export type DomainEventCtor<E> = new (...args: any[]) => E;

@Final()
export class DomainEvents {
  private static subscribers: Map<string, DomainEventHandler[]> = new Map();

  private static aggregates: AggregateRoot<any, any>[] = [];

  public static subscribe<T extends DomainEventHandler, E extends DomainEvent<any>>(
    event: DomainEventCtor<E>,
    eventHandler: T,
  ): void {
    const eventName = event.name;
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName)?.push(eventHandler);
  }

  public static prepareForPublish(aggregate: AggregateRoot<any, any>): void {
    const aggregateFound = !!this.findAggregateByID(aggregate.id);
    if (!aggregateFound) {
      this.aggregates.push(aggregate);
    }
  }

  public static async publishEvents(
    id: UUIDValueObject,
    logger: LoggerPort,
    requestId?: string,
  ): Promise<void> {
    const aggregate = this.findAggregateByID(id);

    if (aggregate) {
      logger.debug(
        `[${aggregate.domainEvents.map((event) => event.eventName)}] published ${
          aggregate.id.value
        }`,
      );
      await Promise.all(
        aggregate.domainEvents.map((event: IDomainEvent<any>) => {
          if (requestId && !event.requestId) {
            event.requestId = requestId;
          }
          return this.publish(event, logger);
        }),
      );
      aggregate.clearEvents();
      this.removeAggregateFromPublishList(aggregate);
    }
  }

  private static findAggregateByID(id: UUIDValueObject): AggregateRoot<any, any> | undefined {
    for (const aggregate of this.aggregates) {
      if (aggregate.id.equals(id)) {
        return aggregate;
      }
    }
  }

  private static removeAggregateFromPublishList(aggregate: AggregateRoot<any, any>): void {
    const index = this.aggregates.findIndex((a) => a.equals(aggregate));
    this.aggregates.splice(index, 1);
  }

  private static async publish(event: IDomainEvent<any>, logger: LoggerPort): Promise<void> {
    const eventName: string = event.constructor.name;

    if (this.subscribers.has(eventName)) {
      const handlers: DomainEventHandler[] = this.subscribers.get(eventName) || [];
      await Promise.all(
        handlers.map((handler) => {
          logger.debug(
            `[${handler.constructor.name}] handling ${event.eventName} ${event.aggregateId}`,
          );
          return handler.handle(event);
        }),
      );
    }
  }
}
