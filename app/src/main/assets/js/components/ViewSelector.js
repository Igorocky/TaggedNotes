"use strict";

const VIEW_NAME_ATTR = '_view'
function createQueryObjectForView(viewName, params) {
    return {[VIEW_NAME_ATTR]:viewName, ...(hasValue(params)?params:{})}
}

const BACKUPS_VIEW = 'BACKUPS_VIEW'
const HTTP_SERVER_VIEW = 'HTTP_SERVER_VIEW'

const NOTES_ADD_VIEW = 'NOTES_ADD_VIEW'
const NOTES_SEARCH_VIEW = 'NOTES_SEARCH_VIEW'
const TAGS_VIEW = 'TAGS_VIEW'

const VIEWS = {}
function addView({name, component, params}) {
    VIEWS[name] = {
        name,
        render({openView, setPageTitle, query, controlsContainer}) {
            return re(component,{...(params??{}), openView, setPageTitle, query, controlsContainer})
        }
    }
}
addView({name: BACKUPS_VIEW, component: BackupsView})
addView({name: HTTP_SERVER_VIEW, component: HttpServerView})

addView({name: NOTES_ADD_VIEW, component: NotesAddView})
addView({name: NOTES_SEARCH_VIEW, component: NotesSearchView})
addView({name: TAGS_VIEW, component: TagsView})

const ViewSelector = ({}) => {
    const [currentViewUrl, setCurrentViewUrl] = useState(null)
    const [pageTitle, setPageTitle] = useState("TaggedNotes")
    const [showMoreControlButtons, setShowMoreControlButtons] = useState(false)

    const controlsContainer = useRef(null)

    const query = parseSearchParams(currentViewUrl)

    useEffect(() => {
        updatePageTitle()
    }, [pageTitle])

    useEffect(() => {
        openView(NOTES_SEARCH_VIEW)
    }, [])

    function updatePageTitle() {
        document.title = pageTitle
    }

    function openView(viewName,params) {
        setCurrentViewUrl(window.location.pathname + '?' + new URLSearchParams(createQueryObjectForView(viewName,params)).toString())
    }

    function getSelectedView() {
        return VIEWS[query[VIEW_NAME_ATTR]]
    }

    function renderSelectedView() {
        const selectedView = getSelectedView()
        if (selectedView) {
            return selectedView.render({
                query,
                openView,
                setPageTitle: str => setPageTitle(str),
                controlsContainer: showMoreControlButtons ? null : controlsContainer
            })
        }
    }

    function renderControlButtons() {
        const selectedViewName = getSelectedView()?.name
        const bgColor = viewName => viewName == selectedViewName ? '#00d0ff' : undefined
        const additionalButtons = [
            [].filter(e=>hasValue(e))
        ]
        const buttons = [[
            {key:NOTES_ADD_VIEW, viewName:NOTES_ADD_VIEW, iconName:'add'},
            {key:NOTES_SEARCH_VIEW, viewName:NOTES_SEARCH_VIEW, iconName:'search'},
            {key:TAGS_VIEW, viewName:TAGS_VIEW, iconName:'sell'},
            {key:BACKUPS_VIEW, viewName:BACKUPS_VIEW, iconName:'archive'},
            IS_IN_WEBVIEW?{key:HTTP_SERVER_VIEW, viewName:HTTP_SERVER_VIEW, iconName:'reset_tv'}:null,
            // getOpenedViewButton(),
            // {key:'more', iconName:"more_horiz", onClick: () => setShowMoreControlButtons(old => !old)},
        ].filter(e=>hasValue(e))]

        if (showMoreControlButtons) {
            buttons.push(...additionalButtons)
        }

        function getOpenedViewButton() {
            const currViewName = query[VIEW_NAME_ATTR]
            for (let i = 0; i < additionalButtons.length; i++) {
                for (let j = 0; j < additionalButtons[i].length; j++) {
                    if (additionalButtons[i][j].viewName == currViewName) {
                        return additionalButtons[i][j]
                    }
                }
            }
            return null
        }

        function openViewInternal(viewName,params) {
            setShowMoreControlButtons(false)
            openView(viewName,params)
        }

        return RE.Container.row.left.center({ref: controlsContainer},{},
            re(KeyPad, {
                componentKey: "controlButtons",
                keys: buttons.map(r => r.map(b => ({...b,onClick: b.onClick??(() => openViewInternal(b.viewName)), style:{backgroundColor:bgColor(b.viewName)}}))),
                variant: "outlined",
            })
        )
    }

    if (currentViewUrl) {
        return RE.Container.col.top.left({}, {},
            renderControlButtons(),
            renderSelectedView()
        )
    } else {
        const newViewUrl = window.location.pathname + window.location.search
        setCurrentViewUrl(newViewUrl)
        return "Starting..."
    }
}