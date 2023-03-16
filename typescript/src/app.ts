//Drag and drop project from IBM Skillbuild Understanding Typescript course
//Completed with the assistance, teaching and guidance of the course instructor

//Drag and Drop interfaces
interface Draggable {
    //handlers to deal with where the drag object starts and ends
    dragStartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void;
};

interface Droppable {
    //check the things your dragging over is a valid drag target- permits the drop
    dragOverHandler(event: DragEvent) : void;
    //reacts to the actual drop when it happens- updates the UI and data
    dropHandler(event: DragEvent) : void;
    //if the drop is cancelled/ not permitted revert the visual update
    dragLeaveHandler(event: DragEvent) : void;

};

//--------------------------------------------------------------------------------------------------------------------------------------------------
//Project state, status and listeners

//Project type
enum ProjectStatus { Active, Finished };

//Project type classs, to store the custom type
class Project {
    constructor(public id: string, public title: string, public description: string, public people: number, public status: ProjectStatus){
    };
};

//Listener type definition
type Listener<T> = (item: T[]) => void;

//Seperate class for states of type listener
class State<T>{
    protected listeners: Listener<T>[] = [];

    addListener(listenerFn: Listener<T>){
        this.listeners.push(listenerFn);
    };
};

//project state management class
class ProjectState extends State<Project>{
    private projects: Project [] = [];
    private static instance: ProjectState;

    private constructor(){
        super();
    };

    static getInstance(){
        if(this.instance){
            return this.instance;
        } else {
            this.instance = new ProjectState();
            return this.instance;
        };
    };

    addProject(title: string, description: string, people: number){
        const newProject = new Project (
            Math.random().toString(),
            title,
            description,
            people,
            ProjectStatus.Active
        );
        this.projects.push(newProject);
        for (const listenerFn of this.listeners){
            listenerFn(this.projects.slice());
        };
    };

    moveProject(projectId: string, newStatus: ProjectStatus) {
        const project = this.projects.find(prj => prj.id === projectId);
        if (project && project.status != newStatus){
            project.status = newStatus;
            this.updateListener();
        };
    };

    private updateListener() {
        for(const listenerFn of this.listeners){
            listenerFn(this.projects.slice());
        }
    }
};

//This is to ensure we are always working with the same object for the entire project
const projectState = ProjectState.getInstance();

//--------------------------------------------------------------------------------------------------------------------------------------------------
//Validation function and decorators

//validation interface to set a general template for validation
interface Validatable {
    value: string | number;
    //? means these are options fields
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

//function to actually validtate the inputs
function validate( validatableInput: Validatable ){
    //set default value to true
    let isValid = true;
    //check something is entered
    if (validatableInput.required){
        isValid = isValid && validatableInput.value.toString().trim().length != 0;
    } //check value is greater than the minimum length
    if (validatableInput.minLength != null && typeof validatableInput.value === 'string'){
        isValid = isValid && validatableInput.value.length > validatableInput.minLength;
    } //check value is smaller than the maximum length
    if (validatableInput.maxLength != null && typeof validatableInput.value === 'string'){
        isValid = isValid && validatableInput.value.length < validatableInput.maxLength;
    } //check value is larger than the minimum number input
    if (validatableInput.min != null && typeof validatableInput.value === 'number'){
        isValid = isValid && validatableInput.value > validatableInput.min;
    } //check value is smaller than the maximum number input
    if (validatableInput.max != null && typeof validatableInput.value === 'number'){
        isValid = isValid && validatableInput.value < validatableInput.max;
    };
    return isValid;
};

//autobind decorator so any method this is used with is bound to the this instance of the class and its values
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
const originalMethod = descriptor.value;
const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
        const boundFn = originalMethod.bind(this);
        return boundFn;
    }
    };
    return adjDescriptor;
};


//--------------------------------------------------------------------------------------------------------------------------------------------------
//Component base class to extract previously repeated code
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;

    constructor(templateId: string, hostElementId: string, insertAtStart: boolean, newElementId?: string){
        //access the html inputs
        this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;
        this.hostElement = document.getElementById(hostElementId)! as T;

        //import the data and store the first element data (section) into the element
        const importedNode = document.importNode(this.templateElement.content, true);
        this.element = importedNode.firstElementChild as U;
        if (newElementId){
            this.element.id = newElementId;
        };

        this.attach(insertAtStart);
    };

    //attach and render items to dom
    private attach(insertAtBeginning: boolean) {
        this.hostElement.insertAdjacentElement(insertAtBeginning ? 'afterbegin': 'beforeend', this.element);
    };

    //so every class that inherits this has to have these two methods
    abstract configure(): void;
    abstract renderContent(): void;

};

//--------------------------------------------------------------------------------------------------------------------------------------------------
//Project Item class, responsible for rendering single project items
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable{
    private project: Project;

    //so gramatically correct string is on the string (eg. 1 people makes no sense)
    get person(){
        if (this.project.people === 1){
            return '1 person assigned';
        } else {
            return `${this.project.people} people assigned`;
        };
    };

     constructor(hostId: string, project: Project){
        super('single-project', hostId, false, project.id);
        this.project = project;
        this.configure();
        this.renderContent();
     };

     //methods from draggable interface
     @autobind
     dragStartHandler(event: DragEvent) {
        event.dataTransfer!.setData('text/plain', this.project.id);
        event.dataTransfer!.effectAllowed = 'move';
     };

     dragEndHandler(_: DragEvent) {
         console.log('dragend');
     }

     //methods from component class
     configure() {
        this.element.addEventListener('dragstart', this.dragStartHandler);
        this.element.addEventListener('dragend', this.dragEndHandler);

     };

     renderContent() {
        this.element.querySelector('h2')!.textContent = this.project.title;
        this.element.querySelector('h3')!.textContent = this.person;
        this.element.querySelector('p')!.textContent = this.project.description;
     };
};

//--------------------------------------------------------------------------------------------------------------------------------------------------
//Project List class, puts elements into the active and finished lists
class ProjectList extends Component<HTMLDivElement, HTMLElement> implements Droppable{
    assignedProjects: Project[];

    //constructor takes type argument to know if the project in the list is finished or unfinished
    constructor(private type: 'active' | 'finished') {
        super('project-list', 'app', false, `${type}-projects` );
        this.assignedProjects = [];
        this.configure();
        this.renderContent();
    }

    //methods from droppable interface
    @autobind
    dragOverHandler(event: DragEvent) {
        if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain'){
            event.preventDefault();
            const listEl = this.element.querySelector('ul')!;
            listEl.classList.add('droppable');
        };
    };

    @autobind
    dropHandler(event: DragEvent) {
        const projectId = event.dataTransfer!.getData('text/plain');
        projectState.moveProject(projectId, this.type === 'active' ? ProjectStatus.Active : ProjectStatus.Finished)
    };

    @autobind
    dragLeaveHandler(_: DragEvent) {
        const listEl = this.element.querySelector('ul')!;
        listEl.classList.remove('droppable');
    };

    
    private renderProjects(){
        const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
        //clears list elements before rerendering to avoid repeated projects appearing on the DOM
        listEl.innerHTML = '';
        for (const projectItem of this.assignedProjects){
            new ProjectItem(this.element.querySelector('ul')!.id, projectItem);
        };
    };

    //from components class
    configure() {
        this.element.addEventListener('dragover', this.dragOverHandler); 
        this.element.addEventListener('drop', this.dropHandler); 
        this.element.addEventListener('dragleave', this.dragLeaveHandler); 
        projectState.addListener((projects: Project[]) => {
            //checks if the projects are active or finished, filters them then renders the projects in the correct places 
            const relevantProjects = projects.filter(project => {
                if (this.type === 'active'){
                    return project.status === ProjectStatus.Active;
                } else {
                    return project.status === ProjectStatus.Finished;
                };
            });
            this.assignedProjects = relevantProjects;
            this.renderProjects();
        });
    };

    renderContent() {
        //Add id to the ul tag
        const listId = `${this.type}-projects-list`;
        this.element.querySelector('ul')!.id = listId;

        //Add heading
        this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + 'PROJECTS';
    };
};

//--------------------------------------------------------------------------------------------------------------------------------------------------
//Project input class- handles user inputs and validates them
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement>{
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;

    constructor() {
        super('project-input', 'app', true, 'user-input')
        //stores each individual input into a different input element
        this.titleInputElement = this.element.querySelector('#title') as HTMLInputElement; 
        this.descriptionInputElement = this.element.querySelector('#description') as HTMLInputElement;
        this.peopleInputElement = this.element.querySelector('#people') as HTMLInputElement;

        this.configure();
    };

    //to satisfy compulsory inherted method
    public renderContent(): void {};

    //once a user hits submit it triggers the submitHandler function
    public configure() {
        this.element.addEventListener('submit', this.submitHandler);
    };

    private gatherUserInput(): [string, string, number] | void {
        //stored in constants to avoid repeating long expressions
        const enteredTitle = this.titleInputElement.value;
        const enteredDescription = this.descriptionInputElement.value;
        const enteredPeople = this.peopleInputElement.value;

        const titleValid: Validatable = {
            value: enteredTitle,
            required: true
        };

        const descValid: Validatable = {
            value: enteredDescription,
            required: true,
            minLength: 5,
            maxLength: 500
        };

        const peopleValid: Validatable = {
            value: enteredPeople,
            required: true,
            min: 1,
            max: 25
        };

        if (!validate(titleValid) || !validate(descValid) || !validate(peopleValid)) {
            alert('Whoops! Something has gone wrong, please enter a valid input...');
        } else {
            return [enteredTitle, enteredDescription, +enteredPeople];
        };

    };

    //clear all the field inputs after hitting submit
    private clearInput(){
        this.titleInputElement.value = '';
        this.descriptionInputElement.value = '';
        this.peopleInputElement.value = '';

    };

    //autobind the elements once they are handled and handle the submission of the form
    @autobind
    private submitHandler(event: Event) {
        event.preventDefault();
        const userInput = this.gatherUserInput();
        if (Array.isArray(userInput)){
            const [title, desc, people] = userInput;
            projectState.addProject(title, desc, people);
        };
        this.clearInput();
    };
};


//--------------------------------------------------------------------------------------------------------------------------------------------------
//create a new instance each class
const proj = new ProjectInput();
const activeproj = new ProjectList('active');
const finproj = new ProjectList('finished');