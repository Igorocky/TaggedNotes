"use strict";

const INFINITY_CHAR = '\u{0221E}'

const AVAILABLE_NOTE_FILTERS = {
    HAS_NO_TAGS:'HAS_NO_TAGS',
    INCLUDE_TAGS:'INCLUDE_TAGS',
    EXCLUDE_TAGS:'EXCLUDE_TAGS',
    CREATED_ON_OR_AFTER:'CREATED_ON_OR_AFTER',
    CREATED_ON_OR_BEFORE:'CREATED_ON_OR_BEFORE',
    TEXT_CONTAINS:'TEXT_CONTAINS',
    SORT_BY:'SORT_BY',
}

const NOTE_FILTER_SORT_ORDER = {
    HAS_NO_TAGS:0,
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

const UseNoteFilter = ({
                                    allTagsMap, onSubmit, onEdit, onClear,
                                    submitButtonIconName = 'search',
                                    allowedFilters, defaultFilters = [AVAILABLE_NOTE_FILTERS.INCLUDE_TAGS, AVAILABLE_NOTE_FILTERS.EXCLUDE_TAGS],
                                    showError, showDialog
                                }) => {
    const af = AVAILABLE_NOTE_FILTERS
    const sb = AVAILABLE_NOTE_SORT_BY
    const sd = AVAILABLE_SORT_DIR

    const [objToTagsMap, setObjToTagsMap] = useState(null)
    const [errorLoadingObjToTagsMap, setErrorLoadingObjToTagsMap] = useState(null)

    const [filtersSelected, setFiltersSelected] = useState(defaultFilters)
    const [focusedFilter, setFocusedFilter] = useState(filtersSelected[0])

    const [tagIdsToInclude, setTagIdsToInclude] = useState([])
    const tagsToInclude = tagIdsToInclude?.map(id => (allTagsMap?.[id])??[])
    const [tagIdsToExclude, setTagIdsToExclude] = useState([])
    const tagsToExclude = tagIdsToExclude?.map(id => (allTagsMap?.[id])??[])
    const [remainingTagIds, setRemainingTagIds] = useState([])
    const remainingTags = remainingTagIds?.map(id => (allTagsMap?.[id])??[])

    const [createdOnOrAfter, setCreatedOnOrAfter] = useState(new Date())
    const [createdOnOrBefore, setCreatedOnOrBefore] = useState(new Date())

    const [textContains, setTextContains] = useState('')

    const [sortBy, setSortBy] = useState(sb.TIME_CREATED)
    const [sortDir, setSortDir] = useState(sd.DESC)

    useEffect(async () => {
        reloadObjToTagsMap()
    }, [])

    useEffect(async () => {
        if (objToTagsMap) {
            recalculateRemainingTags()
        }
    }, [objToTagsMap, tagIdsToInclude, tagIdsToExclude])

    function initFromFilterObject(filter) {
        setFiltersSelected(filter?.filtersSelected??defaultFilters)
        setFocusedFilter(filter?.focusedFilter??filtersSelected[0])
        setTagIdsToInclude(filter?.tagIdsToInclude??[])
        setTagIdsToExclude(filter?.tagIdsToExclude??[])
        setCreatedOnOrAfter(() => hasValue(filter?.createdFrom) ? new Date(filter.createdFrom) : new Date())
        setCreatedOnOrBefore(() => hasValue(filter?.createdTill) ? new Date(filter.createdTill) : new Date())
        setTextContains(filter?.textContains??'')
        setSortBy(filter?.sortBy??sb.TIME_CREATED)
        setSortDir(filter?.sortDir??sd.DESC)
    }

    async function reloadObjToTagsMap() {
        const res = await be.getObjToTagMapping()
        if (res.err) {
            setErrorLoadingObjToTagsMap(res.err)
            showError(res.err)
        } else {
            setObjToTagsMap(res.data)
        }
    }

    function recalculateRemainingTags() {
        const remainingTagIds = []
        for (const objId in objToTagsMap) {
            const objTagIds = objToTagsMap[objId]
            let objPassed = true
            for (const tagId of tagIdsToInclude) {
                if (!objTagIds.includes(tagId)) {
                    objPassed = false
                    break
                }
            }
            if (objPassed) {
                for (const tagId of tagIdsToExclude) {
                    if (objTagIds.includes(tagId)) {
                        objPassed = false
                        break
                    }
                }
                if (objPassed) {
                    remainingTagIds.push(...objTagIds)
                }
            }
        }
        setRemainingTagIds(
            remainingTagIds
                .distinct()
                .filter(tagId => !tagIdsToInclude.includes(tagId) && !tagIdsToExclude.includes(tagId))
        )
    }

    function addFilter(name) {
        setFiltersSelected(prev => [name, ...prev])
        setFocusedFilter(name)
    }

    function removeFilter(name) {
        setFiltersSelected(prev => prev.filter(n => n !== name))
    }

    function renderFilterHeader({filterName, onRemoved, title}) {
        return RE.Container.row.left.center({},{},
            iconButton({
                iconName:'cancel',
                onClick: () => {
                    removeFilter(filterName)
                    onRemoved()
                }}
            ),
            RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, title)
        )
    }

    function createHasNoTagsFilterObject() {
        const filterName = af.HAS_NO_TAGS
        return {
            [filterName]: {
                displayName: 'Notes without tags',
                render: () => RE.Container.col.top.left({},{},
                    renderFilterHeader({filterName, onRemoved: () => null, title: 'Notes without tags.'}),
                ),
                renderMinimized: () => RE.Fragment({},
                    'Notes without tags.',
                ),
                getFilterValues: () => ({hasNoTags: true})
            }
        }
    }

    function createTagsToIncludeFilterObject() {
        const filterName = af.INCLUDE_TAGS
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Tags to include',
                render: () => RE.Container.col.top.left({},{},
                    renderFilterHeader({filterName, onRemoved: () => setTagIdsToInclude([]), title: 'Include:'}),
                    re(TagSelector,{
                        allTags: remainingTags,
                        selectedTags: tagsToInclude,
                        onTagRemoved:tag=>{
                            setTagIdsToInclude(prev=>prev.filter(id=>id!==tag.id))
                        },
                        onTagSelected:tag=>{
                            setTagIdsToInclude(prev=>[...prev,tag.id])
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
                getFilterValues: () => ({tagIdsToInclude})
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
                    renderFilterHeader({filterName, onRemoved: () => setTagIdsToExclude([]), title: 'Exclude:'}),
                    re(TagSelector,{
                        allTags: remainingTags,
                        selectedTags: tagsToExclude,
                        onTagRemoved:tag=>{
                            setTagIdsToExclude(prev=>prev.filter(id=>id!==tag.id))
                        },
                        onTagSelected:tag=>{
                            setTagIdsToExclude(prev=>[...prev,tag.id])
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
                getFilterValues: () => ({tagIdsToExclude})
            }
        }
    }

    function createCreatedOnOrAfterFilterObject() {
        const filterName = af.CREATED_ON_OR_AFTER
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: `[date, ${INFINITY_CHAR})`,
                render: () => RE.Container.col.top.left({},{},
                    renderFilterHeader({filterName, onRemoved: () => setCreatedOnOrAfter(new Date()), title: `[date, ${INFINITY_CHAR}):`}),
                    re(DateSelector,{
                        selectedDate: createdOnOrAfter,
                        onDateSelected: newDate => setCreatedOnOrAfter(newDate),
                        minimized,
                    })
                ),
                renderMinimized: () => `Created: [${createdOnOrAfter.getFullYear()} ${ALL_MONTHS[createdOnOrAfter.getMonth()]} ${createdOnOrAfter.getDate()}, ${INFINITY_CHAR})`,
                getFilterValues: () => ({createdFrom: startOfDay(createdOnOrAfter).getTime()})
            }
        }
    }

    function createCreatedOnOrBeforeFilterObject() {
        const filterName = af.CREATED_ON_OR_BEFORE
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: `(-${INFINITY_CHAR}, date]`,
                render: () => RE.Container.col.top.left({},{},
                    renderFilterHeader({filterName, onRemoved: () => setCreatedOnOrBefore(new Date()), title: `(-${INFINITY_CHAR}, date]:`}),
                    re(DateSelector,{
                        selectedDate: createdOnOrBefore,
                        onDateSelected: newDate => setCreatedOnOrBefore(newDate),
                        minimized,
                    })
                ),
                renderMinimized: () => `Created: (-${INFINITY_CHAR}, ${createdOnOrBefore.getFullYear()} ${ALL_MONTHS[createdOnOrBefore.getMonth()]} ${createdOnOrBefore.getDate()}]`,
                getFilterValues: () => ({createdTill: addMillis(addDays(startOfDay(createdOnOrBefore),1),-1).getTime()})
            }
        }
    }

    function createTextContainsFilterObject() {
        const filterName = af.TEXT_CONTAINS
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Text contains',
                render: () => RE.Container.col.top.left({},{},
                    renderFilterHeader({filterName, onRemoved: () => setTextContains(''), title: 'Text contains:'}),
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
                renderMinimized: () => `Text contains: "${textContains.trim()}"`,
                getFilterValues: () => ({textContains: textContains.trim()})
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
                    renderFilterHeader({
                        filterName,
                        onRemoved: () => {
                            setSortBy(sb.TIME_CREATED)
                            setSortDir(sd.ASC)
                        },
                        title: 'Sort by:'
                    }),
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

    function clearFilters() {
        initFromFilterObject({})
        onClear?.()
    }

    const allFilterObjects = {
        ...createHasNoTagsFilterObject(),
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
                af.HAS_NO_TAGS,
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
            .filter(filterName =>
                (filterName !== af.INCLUDE_TAGS || tagIdsToInclude.length)
                && (filterName !== af.EXCLUDE_TAGS || tagIdsToExclude.length)
                && (filterName !== af.TEXT_CONTAINS || textContains.trim().length)
            )
    }

    const effectiveSelectedFilterNames = getEffectiveSelectedFilterNames()
    function getSelectedFilter() {
        return {
            ...(
                effectiveSelectedFilterNames
                    .map(filterName => allFilterObjects[filterName])
                    .reduce((acc, elem) => ({...acc, ...elem.getFilterValues()}), {})
            ),
            filtersSelected
        }
    }

    function renderFilter({minimized, onSubmit}) {
        if (errorLoadingObjToTagsMap) {
            return RE.Fragment({},
                `An error occurred during loading of object to tags mapping: [${errorLoadingObjToTagsMap.code}] - ${errorLoadingObjToTagsMap.msg}`,
            )
        } else if (hasNoValue(allTagsMap)) {
            return RE.Fragment({}, `Loading tags...`,)
        } else if (minimized) {
            const filtersToRender = getEffectiveSelectedFilterNames().sortBy(n => NOTE_FILTER_SORT_ORDER[n])
            return RE.Paper({style:{padding:'5px', backgroundColor:'rgb(245,245,245)'}},
                RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{style:{marginRight:'20px'}},
                        iconButton({iconName:'youtube_searched_for', onClick: onEdit}),
                        RE.If(hasValue(onClear), () => iconButton({iconName:'clear', onClick: clearFilters})),
                    ),
                    filtersToRender.length
                        ? filtersToRender.map(filterName => allFilterObjects[filterName].renderMinimized())
                        : 'All notes'
                )
            )
        } else {
            const searchIsDisabled = effectiveSelectedFilterNames.length === 0
            return RE.Container.col.top.left({style:{marginTop:'5px'}},{style:{marginTop:'5px'}},
                RE.Container.row.left.center({},{},
                    renderAddFilterButton(),
                    iconButton({
                        iconName:submitButtonIconName,
                        onClick: () => onSubmit(getSelectedFilter()),
                        disabled: searchIsDisabled,
                        iconStyle: {color:searchIsDisabled?'lightgrey':'black'},
                    }),
                ),
                renderSelectedFilters(),
            )
        }
    }

    return {renderFilter, reloadObjToTagsMap}
}
