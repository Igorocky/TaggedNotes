"use strict";

const AVAILABLE_NOTE_FILTERS = {
    INCLUDE_TAGS:'INCLUDE_TAGS',
    EXCLUDE_TAGS:'EXCLUDE_TAGS',
    CREATED_ON_OR_AFTER:'CREATED_ON_OR_AFTER',
    CREATED_ON_OR_BEFORE:'CREATED_ON_OR_BEFORE',
    TEXT_CONTAINS:'TEXT_CONTAINS',
    SORT_BY:'SORT_BY',
}

const NOTE_FILTER_SORT_ORDER = {
    INCLUDE_TAGS:1,
    EXCLUDE_TAGS:2,
    CREATED_ON_OR_AFTER:3,
    CREATED_ON_OR_BEFORE:4,
    TEXT_CONTAINS:5,
    SORT_BY:6,
}

const AVAILABLE_NOTE_SORT_BY = {
    TIME_CREATED:'TIME_CREATED',
}

const AVAILABLE_SORT_DIR = {
    ASC:'ASC',
    DESC:'DESC',
}

const NoteFilterCmp = ({
                                    allTags, allTagsMap, initialState, stateRef, onSubmit, minimized,
                                    submitButtonIconName = 'search',
                                    allowedFilters, defaultFilters = [AVAILABLE_NOTE_FILTERS.INCLUDE_TAGS, AVAILABLE_NOTE_FILTERS.EXCLUDE_TAGS],
                                    objUpdateCounter
                                }) => {
    const {renderMessagePopup, showError, showDialog} = useMessagePopup()
    const af = AVAILABLE_NOTE_FILTERS
    const sb = AVAILABLE_NOTE_SORT_BY
    const sd = AVAILABLE_SORT_DIR

    const [objToTagsMap, setObjToTagsMap] = useState(null)
    const [errorLoadingObjToTagsMap, setErrorLoadingObjToTagsMap] = useState(null)

    const [filtersSelected, setFiltersSelected] = useState(initialState?.filtersSelected??defaultFilters)
    const [focusedFilter, setFocusedFilter] = useState(initialState?.focusedFilter??filtersSelected[0])

    const [tagsToInclude, setTagsToInclude] = useState(initialState?.tagsToInclude??[])
    const [tagsToExclude, setTagsToExclude] = useState(initialState?.tagsToExclude??[])
    const [remainingTags, setRemainingTags] = useState([])

    const [createdOnOrAfter, setCreatedOnOrAfter] = useState(() => initialState?.createdOnOrAfter ? new Date(initialState?.createdOnOrAfter) : new Date())
    const [createdOnOrBefore, setCreatedOnOrBefore] = useState(() => initialState?.createdOnOrBefore ? new Date(initialState?.createdOnOrBefore) : new Date())

    const [textContains, setTextContains] = useState(initialState?.textContains??'')

    const [sortBy, setSortBy] = useState(initialState?.sortBy??sb.TIME_CREATED)
    const [sortDir, setSortDir] = useState(initialState?.sortDir??sd.DESC)

    if (stateRef) {
        stateRef.current = {}
        stateRef.current.filtersSelected = filtersSelected
        stateRef.current.focusedFilter = focusedFilter
        stateRef.current.tagsToInclude = tagsToInclude
        stateRef.current.tagsToExclude = tagsToExclude
        stateRef.current.createdOnOrAfter = createdOnOrAfter.getTime()
        stateRef.current.createdOnOrBefore = createdOnOrBefore.getTime()
        stateRef.current.textContains = textContains
        stateRef.current.sortBy = sortBy
        stateRef.current.sortDir = sortDir
    }

    useEffect(() => {
        if (initialState) {
            doSubmit()
        }
    }, [])

    useEffect(async () => {
        const res = await be.getObjToTagMapping()
        if (res.err) {
            setErrorLoadingObjToTagsMap(res.err)
            showError(res.err)
        } else {
            setObjToTagsMap(res.data)
        }
    }, [objUpdateCounter])

    useEffect(async () => {
        if (objToTagsMap) {
            recalculateRemainingTags()
        }
    }, [objToTagsMap, tagsToInclude, tagsToExclude])

    function recalculateRemainingTags() {
        const remainingTagIds = []
        for (const objId in objToTagsMap) {
            const objTagIds = objToTagsMap[objId]
            let objPassed = true
            for (const tag of tagsToInclude) {
                if (!objTagIds.includes(tag.id)) {
                    objPassed = false
                    break
                }
            }
            if (objPassed) {
                for (const tag of tagsToExclude) {
                    if (objTagIds.includes(tag.id)) {
                        objPassed = false
                        break
                    }
                }
                if (objPassed) {
                    remainingTagIds.push(...objTagIds)
                }
            }
        }
        const tagIdsToInclude = tagsToInclude.map(t=>t.id)
        const tagIdsToExclude = tagsToExclude.map(t=>t.id)
        const remainingTags = remainingTagIds
            .distinct()
            .filter(tagId => !tagIdsToInclude.includes(tagId) && !tagIdsToExclude.includes(tagId))
            .map(tagId => allTagsMap[tagId])
        setRemainingTags(remainingTags)
    }

    function addFilter(name) {
        setFiltersSelected(prev => [name, ...prev])
        setFocusedFilter(name)
    }

    function removeFilter(name) {
        setFiltersSelected(prev => prev.filter(n => n !== name))
    }

    function createTagsToIncludeFilterObject() {
        const filterName = af.INCLUDE_TAGS
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Tags to include',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setTagsToInclude([])
                            }}
                        ),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Include:')
                    ),
                    re(TagSelector,{
                        allTags: remainingTags,
                        selectedTags: tagsToInclude,
                        onTagRemoved:tag=>{
                            setTagsToInclude(prev=>prev.filter(t=>t.id!==tag.id))
                        },
                        onTagSelected:tag=>{
                            setTagsToInclude(prev=>[...prev,tag])
                        },
                        label: 'Include',
                        color:'primary',
                        minimized,
                        autoFocus: true,
                    })
                ),
                renderMinimized: () => RE.Fragment({},
                    'Include: ',
                    renderListOfTags({tags: tagsToInclude, color:'blue'})
                ),
                getFilterValues: () => ({tagIdsToInclude: tagsToInclude.map(t=>t.id)})
            }
        }
    }

    function createTagsToExcludeFilterObject() {
        const filterName = af.EXCLUDE_TAGS
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Tags to exclude',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setTagsToExclude([])
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Exclude:')
                    ),
                    re(TagSelector,{
                        allTags: remainingTags,
                        selectedTags: tagsToExclude,
                        onTagRemoved:tag=>{
                            setTagsToExclude(prev=>prev.filter(t=>t.id!==tag.id))
                        },
                        onTagSelected:tag=>{
                            setTagsToExclude(prev=>[...prev,tag])
                        },
                        label: 'Exclude',
                        color:'secondary',
                        minimized,
                        autoFocus: true,
                    })
                ),
                renderMinimized: () => RE.Fragment({},
                    'Exclude: ',
                    renderListOfTags({tags: tagsToExclude, color:'red'})
                ),
                getFilterValues: () => ({tagIdsToExclude: tagsToExclude.map(t=>t.id)})
            }
        }
    }

    function createCreatedOnOrAfterFilterObject() {
        const filterName = af.CREATED_ON_OR_AFTER
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Created on or after',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setCreatedOnOrAfter(new Date())
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Created on or after:')
                    ),
                    re(DateSelector,{
                        selectedDate: createdOnOrAfter,
                        onDateSelected: newDate => setCreatedOnOrAfter(newDate),
                        minimized,
                    })
                ),
                renderMinimized: () => `Created on or after: ${createdOnOrAfter.getFullYear()} ${ALL_MONTHS[createdOnOrAfter.getMonth()]} ${createdOnOrAfter.getDate()}`,
                getFilterValues: () => ({createdFrom: startOfDay(createdOnOrAfter).getTime()})
            }
        }
    }

    function createCreatedOnOrBeforeFilterObject() {
        const filterName = af.CREATED_ON_OR_BEFORE
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Created on or before',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setCreatedOnOrBefore(new Date())
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Created on or before:')
                    ),
                    re(DateSelector,{
                        selectedDate: createdOnOrBefore,
                        onDateSelected: newDate => setCreatedOnOrBefore(newDate),
                        minimized,
                    })
                ),
                renderMinimized: () => `Created on or before: ${createdOnOrBefore.getFullYear()} ${ALL_MONTHS[createdOnOrBefore.getMonth()]} ${createdOnOrBefore.getDate()}`,
                getFilterValues: () => ({createdTill: addDays(startOfDay(createdOnOrBefore),1).getTime()})
            }
        }
    }

    function createTextContainsFilterObject() {
        const filterName = af.TEXT_CONTAINS
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Native text contains',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setTextContains('')
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Native text contains:')
                    ),
                    RE.If(minimized, () => RE.span({style:{padding:'5px', color:'blue'}}, `"${textContains}"`)),
                    RE.IfNot(minimized, () => textField({
                        value: textContains,
                        label: 'Text contains',
                        variant: 'outlined',
                        autoFocus:true,
                        multiline: false,
                        maxRows: 1,
                        size: 'small',
                        inputProps: {size:24},
                        style: {margin:'5px'},
                        onChange: event => {
                            const newText = event.nativeEvent.target.value
                            if (newText !== textContains) {
                                setTextContains(newText)
                            }
                        },
                    }))
                ),
                renderMinimized: () => `Text contains: "${textContains}"`,
                getFilterValues: () => ({textContains: textContains})
            }
        }
    }

    function createSortByFilterObject() {
        const filterName = af.SORT_BY
        const minimized = filterName !== focusedFilter
        const possibleParams = {
            [sb.TIME_CREATED]:{displayName:'Date created'},
        }
        const possibleDirs = {[sd.ASC]:{displayName:'A-Z'}, [sd.DESC]:{displayName:'Z-A'}}
        return {
            [filterName]: {
                displayName: 'Sort by',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setSortBy(sb.TIME_CREATED)
                                setSortDir(sd.ASC)
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Sort by:')
                    ),
                    re(SortBySelector,{
                        possibleParams: possibleParams,
                        selectedParam: sortBy,
                        onParamSelected: newSortBy => setSortBy(newSortBy),
                        possibleDirs: possibleDirs,
                        selectedDir: sortDir,
                        onDirSelected: newSortDir => setSortDir(newSortDir),
                        minimized,
                    })
                ),
                renderMinimized: () => `Sort by: ${possibleParams[sortBy].displayName} ${possibleDirs[sortDir].displayName}`,
                getFilterValues: () => ({sortBy, sortDir})
            }
        }
    }

    const allFilterObjects = {
        ...createTagsToIncludeFilterObject(),
        ...createTagsToExcludeFilterObject(),
        ...createCreatedOnOrAfterFilterObject(),
        ...createCreatedOnOrBeforeFilterObject(),
        ...createTextContainsFilterObject(),
        ...createSortByFilterObject(),
    }

    function renderSelectedFilters() {
        return RE.Container.col.top.left({style:{marginTop:'5px'}},{style:{marginTop:'5px'}},
            filtersSelected.map(filterName => RE.Paper({onClick: () => focusedFilter !== filterName ? setFocusedFilter(filterName) : null},
                allFilterObjects[filterName].render()
            ))
        )
    }

    function renderAvailableFilterListItem({filterName, filterDisplayName, resolve}) {
        return RE.If(!filtersSelected.includes(filterName), () => RE.Fragment({key:filterName},
            RE.ListItem(
                {key:filterName, button:true, onClick: () => resolve(filterName)},
                RE.ListItemText({}, filterDisplayName)
            ),
            RE.Divider({key:filterName+'-d'})
        ))
    }

    function renderListOfAvailableFilters(resolve) {
        let filterNames = hasValue(allowedFilters)
            ? allowedFilters
            : [
                af.INCLUDE_TAGS,
                af.EXCLUDE_TAGS,
                af.CREATED_ON_OR_AFTER,
                af.CREATED_ON_OR_BEFORE,
                af.TEXT_CONTAINS,
                af.SORT_BY,
            ]
        return RE.List({},
            filterNames.map(filterName =>
                renderAvailableFilterListItem({filterName, filterDisplayName: allFilterObjects[filterName].displayName, resolve})
            )
        )
    }

    function renderAddFilterButton() {
        return iconButton({
            iconName: 'playlist_add',
            onClick: async () => {
                const selectedFilter = await showDialog({
                    title: 'Select filter:',
                    cancelBtnText: 'cancel',
                    contentRenderer: resolve => {
                        return renderListOfAvailableFilters(resolve)
                    }
                })
                if (hasValue(selectedFilter)) {
                    addFilter(selectedFilter)
                }
            }
        })
    }

    function getEffectiveSelectedFilterNames() {
        return filtersSelected
            .filter(filterName => (filterName !== af.INCLUDE_TAGS || tagsToInclude.length) && (filterName !== af.EXCLUDE_TAGS || tagsToExclude.length))
    }

    function getSelectedFilter() {
        return getEffectiveSelectedFilterNames()
            .map(filterName => allFilterObjects[filterName])
            .reduce((acc,elem) => ({...acc,...elem.getFilterValues()}), {})
    }

    function doSubmit() {
        onSubmit(getSelectedFilter())
    }

    function renderComponentContent() {
        if (errorLoadingObjToTagsMap) {
            return RE.Fragment({},
                `An error occurred during loading of object to tags mapping: [${errorLoadingObjToTagsMap.code}] - ${errorLoadingObjToTagsMap.msg}`,
            )
        } else if (hasNoValue(allTags) || hasNoValue(allTagsMap) || hasNoValue(objToTagsMap)) {
            return 'Loading tags...'
        } else {
            return RE.Container.col.top.left({style:{marginTop:'5px'}},{style:{marginTop:'5px'}},
                RE.Container.row.left.center({},{},
                    renderAddFilterButton(),
                    iconButton({iconName:submitButtonIconName, onClick: doSubmit})
                ),
                renderSelectedFilters(),
            )
        }
    }

    if (minimized) {
        const filtersToRender = getEffectiveSelectedFilterNames().sortBy(n => NOTE_FILTER_SORT_ORDER[n])
        return RE.Paper({style:{padding:'5px'}},
            filtersToRender.length ? RE.Container.col.top.left({},{},
                filtersToRender.map(filterName => allFilterObjects[filterName].renderMinimized())
            ) : 'All cards'
        )
    } else {
        return RE.Fragment({},
            renderComponentContent(),
            renderMessagePopup()
        )
    }
}
