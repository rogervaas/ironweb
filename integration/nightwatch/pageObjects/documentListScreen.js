/**
 * Actions and assertions for document list page view
 */
const documentListActions = {
    expectTodoListStorageType(selector, position){
        this.api.elements(this.client.locateStrategy, this.elements.listItems.selector, (elements) => {
            this.api.elementIdElement(elements.value[position].ELEMENT, this.client.locateStrategy, selector, (chipElement) => {
                this.assert.equal(chipElement.status, 0, chipElement.status === -1 ? chipElement.value.message : "Found correct storage chip");
            });
        });
        return this;
    },
    refreshList(){
        return this.click('@refreshDocumentList');
    },
    clickAddNewDocument(){
        return this.click('@newDocumentButton');
    },
    expectCountOfTodoLists(length){
        this.api.elements(this.client.locateStrategy, this.elements.listItems.selector, (elements) => {
            this.assert.equal(elements.value.length, length, `Todo list length, expected item count of "${length}, found "${elements.value.length}"`);
        });
        return this;
    },
    expectTodoListNameAtPosition(position, name){
        this.api.elements(this.client.locateStrategy, this.elements.listItems.selector, (elements) => {
            this.api.elementIdText(elements.value[position].ELEMENT, (elementText) => {
                this.assert.equal(elementText.value.includes(name), true, `Todo list content, expected roughly "${name}", found "${elementText.value}"`);
            });
        });
        return this;
    },
    expectTodoListHostedAtPosition(position){
        return this.expectTodoListStorageType(this.elements.hostedStorageChip.selector, position);
    },
    expectTodoListLocalAtPosition(position){
        return this.expectTodoListStorageType(this.elements.localStorageChip.selector, position);
    },
    clickOnNthTodoList(item){
        this.api.elements(this.client.locateStrategy, this.elements.listItems.selector, (elements) => {
            this.api.elementIdClick(elements.value[item].ELEMENT);
        });
    },
};

const documentListElements = {
    pageTitle: {selector: '.page-title'},
    listItems: {selector: '.document-list-item'},
    newDocumentButton: {selector: '.new-document'},
    hostedStorageChip: {selector: '.storage-type-hosted'},
    localStorageChip: {selector: '.storage-type-local'},
    refreshDocumentList: {selector: '.refresh-document-list'},
};

module.exports = {
    commands: [documentListActions],
    elements: documentListElements,
    selector: '.document-list',
};