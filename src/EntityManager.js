import find from 'lodash/collection/find';

import QuerySet from './QuerySet';
import {
    CREATE,
    ORDER,
} from './constants';
import {match, attachQuerySetMethods} from './utils.js';

/**
 * A class that manages an entity tree branch.
 *
 * The manager shares the following methods with {@link QuerySet}:
 *
 * - [toPlain]{@link QuerySet#toPlain}
 * - [all]{@link QuerySet#all}
 * - [filter]{@link QuerySet#filter}
 * - [exclude]{@link QuerySet#exclude}
 * - [orderBy]{@link QuerySet#orderBy}
 * - [exists]{@link QuerySet#exists}
 * - [first]{@link QuerySet#first}
 * - [last]{@link QuerySet#last}
 * - [at]{@link QuerySet#at}
 * - [delete]{@link QuerySet#delete}
 * - [update]{@link QuerySet#update}
 *
 */
const EntityManager = class EntityManager {
    constructor(model) {
        this.model = model;
        Object.assign(this, {
            state: model.state,
        });
    }

    getEntityMap() {
        return this.state[this.model.mapName];
    }

    getIdArray() {
        return this.state[this.model.arrName];
    }

    getId(id) {
        return this.getEntityMap()[id];
    }

    getPlainEntity(id, includeIdAttribute) {
        let entity = this.getId(id);
        if (!!includeIdAttribute) {
            entity = Object.assign({[this.model.idAttribute]: id}, entity);
        }

        return entity;
    }

    getPlainEntityWithId(id) {
        return this.getPlainEntity(id, true);
    }

    /**
     * Returns the id to be assigned to a new entity.
     * You may override this to suit your needs.
     * @return {*} the id value for a new entity.
     */
    nextId() {
        return Math.max(...this.getIdArray()) + 1;
    }

    getQuerySet() {
        const QuerySetClass = this.querySetClass;
        return new QuerySetClass(this, this.getIdArray(), {entityClass: this.model});
    }

    getQuerySetFromIds(ids) {
        const QuerySetClass = this.querySetClass;
        return new QuerySetClass(this, ids, {entityClass: this.model});
    }

    /**
     * Returns a QuerySet containing all entities.
     * @return {QuerySet} a QuerySet containing all entities
     */
    all() {
        return this.getQuerySet();
    }

    /**
     * Records the addition of a new entity and returns a
     * new Entity instance. If you specify an id in
     * `props[this.schema.idAttribute]`, it will be used as the
     * id for the new Entity. Otherwise it will be generated by
     * [nextId]{@link EntityManager#nextId}
     *
     * @param  {props} props - the new Entity's properties.
     * @return {Entity} a new Entity instance.
     */
    create(props) {
        this.model.addMutation({
            type: CREATE,
            payload: props,
        });
        const Model = this.model;
        return new Model(props);
    }

    /**
     * Gets the Entity instance that matches properties in `lookupObj`.
     * Throws an error if Entity is not found.
     *
     * @param  {Object} lookupObj - the properties used to match a single entity.
     * @return {Entity} an Entity instance that matches `lookupObj` properties.
     */
    get(lookupObj) {
        if (!this.getIdArray().length) {
            throw new Error('Tried getting from empty QuerySet');
        }
        const Model = this.model;

        const keys = Object.keys(lookupObj);
        if (keys.includes(this.model.idAttribute)) {
            // We treat `idAttribute` as unique, so if it's
            // in `lookupObj` we search with that attribute only.
            return new Model(this.getPlainEntity(lookupObj[this.model.idAttribute], true));
        }
        const found = find(this.toPlain(), entity => match(lookupObj, entity));

        if (!found) {
            throw new Error('Entity not found when calling get method');
        }
        return new Model(found);
    }

    /**
     * Records an ordering mutation for the entities.
     * Note that if you create or update any entities after
     * calling this, they won't be in order.
     *
     * See the shared {@link QuerySet} method [orderBy]{@link QuerySet#orderBy}
     * that returns an ordered {@link QuerySet}.
     *
     * @param {function|string|string[]} orderArg - A function, an attribute name or a list of attribute
     *                                              names to order the entities by. If you supply a function,
     *                                              it must return a value user to order the entities.
     * @return {undefined}
     */
    setOrder(orderArg) {
        this.model.addMutations.push({
            type: ORDER,
            payload: orderArg,
        });
    }
};

EntityManager.prototype.querySetClass = QuerySet;
attachQuerySetMethods(EntityManager.prototype, QuerySet.prototype.defaultSharedMethodNames);
attachQuerySetMethods(EntityManager.prototype, QuerySet.prototype.sharedMethodNames);

export default EntityManager;